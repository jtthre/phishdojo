-- PhishDojo Senegal - V1 : stockage des signalements.
--
-- Defense en profondeur :
--   1. le navigateur masque le message avant l'envoi (web/masquage.js) ;
--   2. ce declencheur remasque les identifiants deterministes (numeros, e-mails,
--      references, codes, parametres d'URL), au cas ou le client serait contourne ;
--   3. le role public (anon) peut INSERER, et rien d'autre : ni lire, ni modifier ;
--   4. le numero de l'expediteur n'est jamais stocke : seule une empreinte HMAC l'est,
--      avec une cle qui ne quitte pas la base, pour compter les recidives (V4).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Schema non expose par l'API : la cle HMAC et les fonctions internes.
create schema if not exists prive;
revoke all on schema prive from public;

create table if not exists prive.cle (
  id     int primary key default 1 check (id = 1),
  valeur bytea not null default extensions.gen_random_bytes(32)
);
insert into prive.cle default values on conflict do nothing;

create table if not exists public.signalements (
  id                   uuid primary key,
  cree_le              timestamptz not null default now(),
  recu_le              date,
  canal                text not null check (canal in ('sms', 'whatsapp', 'appel', 'email', 'reseau_social', 'autre')),
  marque               text check (marque in ('wave', 'orange_money', 'free_money', 'wizall', 'banque', 'operateur',
                                              'administration', 'livraison', 'autre', 'aucune')),
  langue               text check (langue in ('fr', 'wo', 'fr_wo', 'autre')),
  mode                 text check (mode in ('code_annulation', 'faux_agent', 'faux_gain', 'trop_percu', 'faux_fournisseur',
                                            'qr_code', 'faux_emploi', 'faux_colis', 'faux_placement', 'autre', 'ne_sait_pas')),
  texte                text not null check (char_length(texte) between 10 and 2000),
  domaines             text[] not null default '{}' check (cardinality(domaines) <= 20),
  expediteur           text,   -- transitoire : toujours vide une fois la ligne ecrite
  expediteur_empreinte text,
  version_masquage     text not null default 'm1' check (char_length(version_masquage) <= 10)
);

comment on table public.signalements is
  'Messages d''arnaque signales, masques avant stockage. Aucune donnee personnelle attendue.';
comment on column public.signalements.expediteur is
  'Champ d''entree uniquement : vide par le declencheur, remplace par expediteur_empreinte.';

-- ---------------------------------------------------------------------------- masquage serveur
create or replace function prive.remasquer(t text) returns text
language plpgsql stable
set search_path = ''
as $$
begin
  -- chiffres « exotiques » ramenes a 0-9, caracteres invisibles retires (contournement du masquage)
  t := regexp_replace(normalize(t, NFKC), '[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]', '', 'g');
  -- e-mails
  t := regexp_replace(t, '[[:alnum:]._%+-]+@[[:alnum:]-]+(\.[[:alnum:]-]+)+', '[E-MAIL]', 'g');
  -- parametres d'URL (apres un nom de domaine)
  t := regexp_replace(t, '(\.[[:alpha:]]{2,}[^[:space:]?]*)\?[^[:space:]]+', '\1?[PARAMÈTRES]', 'g');
  -- numeros senegalais, avec ou sans indicatif
  t := regexp_replace(t, '(\+?\m(00)?221[ .-]?)?\m(7[0-8]|3[03])[ .-]?[0-9]{3}[ .-]?[0-9]{2}[ .-]?[0-9]{2}\M', '[NUMÉRO]', 'g');
  -- numeros internationaux
  t := regexp_replace(t, '(\+|\m00)[0-9][0-9 .()-]{6,18}[0-9]', '[NUMÉRO]', 'g');
  -- references : lettres et chiffres melanges, 6 caracteres ou plus
  t := regexp_replace(t, '\m(?=[A-Za-z0-9._/-]*[0-9])(?=[A-Za-z0-9._/-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9._/-]{5,}', '[RÉFÉRENCE]', 'g');
  -- toute suite d'au moins 8 chiffres
  t := regexp_replace(t, '[0-9]([ .-]?[0-9]){7,}', '[NUMÉRO]', 'g');
  -- codes de 4 a 8 chiffres (les annees sont conservees)
  t := regexp_replace(t, '\m(?!(19|20)[0-9]{2}\M)[0-9]{4,8}\M', '[CODE]', 'g');
  return t;
end;
$$;

create or replace function prive.avant_insertion() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  chiffres text;
  recents  int;
begin
  -- limite de debit globale : protege la base d'un remplissage automatise
  select count(*) into recents from public.signalements where cree_le > now() - interval '1 minute';
  if recents >= 30 then
    raise exception 'Trop de signalements en ce moment, reessayez dans une minute.' using errcode = 'P0001';
  end if;

  new.cree_le := now();
  if new.recu_le is not null and (new.recu_le < date '2020-01-01' or new.recu_le > current_date + 1) then
    new.recu_le := null;
  end if;

  new.texte := prive.remasquer(new.texte);

  -- domaines : minuscules, syntaxe d'hote valide, sans doublon
  select coalesce(array_agg(distinct d), '{}') into new.domaines
  from (
    select lower(trim(x)) as d from unnest(coalesce(new.domaines, '{}')) as x
  ) s
  where d ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$';

  -- expediteur : empreinte HMAC-SHA256, puis effacement
  new.expediteur_empreinte := null;
  if new.expediteur is not null then
    chiffres := regexp_replace(new.expediteur, '[^0-9]', '', 'g');
    if left(chiffres, 2) = '00' then chiffres := substr(chiffres, 3); end if;
    if length(chiffres) = 9 and chiffres ~ '^(7[0-8]|3[03])' then chiffres := '221' || chiffres; end if;
    if length(chiffres) between 8 and 15 then
      new.expediteur_empreinte := encode(
        extensions.hmac(convert_to(chiffres, 'UTF8'), (select valeur from prive.cle where id = 1), 'sha256'), 'hex');
    end if;
  end if;
  new.expediteur := null;

  return new;
end;
$$;

drop trigger if exists signalements_avant_insertion on public.signalements;
create trigger signalements_avant_insertion
  before insert on public.signalements
  for each row execute function prive.avant_insertion();

-- ---------------------------------------------------------------------------- droits
alter table public.signalements enable row level security;

drop policy if exists insertion_publique on public.signalements;
create policy insertion_publique on public.signalements
  for insert to anon, authenticated
  with check (true);

revoke all on public.signalements from anon, authenticated;
grant insert (id, recu_le, canal, marque, langue, mode, texte, domaines, expediteur, version_masquage)
  on public.signalements to anon, authenticated;

-- Suppression sur demande : l'identifiant (UUID tire au hasard dans le navigateur) sert de cle.
create or replace function public.supprimer_signalement(p_id uuid) returns boolean
language sql security definer
set search_path = ''
as $$
  with supprime as (delete from public.signalements where id = p_id returning 1)
  select exists (select 1 from supprime);
$$;

revoke all on function public.supprimer_signalement(uuid) from public;
grant execute on function public.supprimer_signalement(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------- conservation
-- Les signalements sont conserves 24 mois au plus (engagement affiche sur la page).
-- Planification : voir docs/INSTALLER.md (pg_cron, une fois par jour).
create or replace function prive.purger() returns int
language sql security definer
set search_path = ''
as $$
  with supprime as (delete from public.signalements where cree_le < now() - interval '24 months' returning 1)
  select count(*)::int from supprime;
$$;
revoke all on function prive.purger() from public;
