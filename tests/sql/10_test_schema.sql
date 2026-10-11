-- Tests du schema : a lancer apres la migration, avec psql -v ON_ERROR_STOP=1.
\set QUIET on

-- 1. Une insertion anonyme est remasquee, l'expediteur est remplace par une empreinte.
set role anon;
insert into public.signalements (id, canal, marque, langue, texte, domaines, expediteur)
values ('11111111-1111-4111-8111-111111111111', 'sms', 'wave', 'fr',
        'Appelez le 77 123 45 67 ou +33 6 12 34 56 78, ecrivez a test.personne@gmail.com, code 482913, ref CI231005.1512.A12345, lien https://faux-site.top/p?tel=771234567',
        array['FAUX-SITE.top', 'pas un domaine', 'faux-site.top'], '+221 77 999 88 77');
reset role;

do $$
declare r public.signalements;
begin
  select * into r from public.signalements where id = '11111111-1111-4111-8111-111111111111';
  assert r.texte !~ '[0-9]{4,}', 'il reste des chiffres sensibles : ' || r.texte;
  assert r.texte !~ '@', 'e-mail non masque : ' || r.texte;
  assert r.texte ~ '\[NUMÉRO\]' and r.texte ~ '\[E-MAIL\]' and r.texte ~ '\[CODE\]' and r.texte ~ '\[RÉFÉRENCE\]'
     and r.texte ~ '\[PARAMÈTRES\]', 'jetons attendus absents : ' || r.texte;
  assert r.expediteur is null, 'expediteur stocke en clair';
  assert r.expediteur_empreinte ~ '^[0-9a-f]{64}$', 'empreinte absente';
  assert r.domaines = array['faux-site.top'], 'domaines mal nettoyes : ' || r.domaines::text;
  raise notice 'OK 1 - remasquage serveur et empreinte : %', r.texte;
end $$;

-- 2. La meme personne donne la meme empreinte, quel que soit le format du numero.
set role anon;
insert into public.signalements (id, canal, texte, expediteur)
values ('22222222-2222-4222-8222-222222222222', 'whatsapp', 'Deuxieme signalement du meme numero.', '779998877');
reset role;
do $$ begin
  assert (select count(distinct expediteur_empreinte) from public.signalements
          where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) = 1,
         'empreintes differentes pour le meme numero';
  raise notice 'OK 2 - empreinte stable entre formats';
end $$;

-- 3. Le role public ne peut ni lire, ni modifier, ni choisir les colonnes calculees.
set role anon;
do $$ begin
  begin perform 1 from public.signalements; raise exception 'lecture autorisee';
  exception when insufficient_privilege then raise notice 'OK 3a - lecture refusee'; end;
  begin update public.signalements set texte = 'modifie par anon !!' ; raise exception 'modification autorisee';
  exception when insufficient_privilege then raise notice 'OK 3b - modification refusee'; end;
  begin insert into public.signalements (id, canal, texte, expediteur_empreinte)
        values ('33333333-3333-4333-8333-333333333333', 'sms', 'Tentative de forcer une empreinte', 'abc');
        raise exception 'colonne calculee ecrite';
  exception when insufficient_privilege then raise notice 'OK 3c - colonnes calculees protegees'; end;
  begin insert into public.signalements (id, canal, texte) values ('44444444-4444-4444-8444-444444444444', 'pigeon', 'Canal inconnu ici');
        raise exception 'canal invalide accepte';
  exception when check_violation then raise notice 'OK 3d - canal invalide refuse'; end;
end $$;
reset role;

-- 4. Suppression sur demande avec l'identifiant.
set role anon;
do $$ begin
  assert public.supprimer_signalement('22222222-2222-4222-8222-222222222222') = true, 'suppression echouee';
  assert public.supprimer_signalement('22222222-2222-4222-8222-222222222222') = false, 'double suppression';
  raise notice 'OK 4 - suppression par identifiant';
end $$;
reset role;

-- 5. Limite de debit : au-dela de 30 signalements par minute, la base refuse.
delete from public.signalements;
set role anon;
do $$
declare i int;
begin
  for i in 1..30 loop
    insert into public.signalements (id, canal, texte) values (gen_random_uuid(), 'sms', 'Message de remplissage numero ' || i);
  end loop;
  begin
    insert into public.signalements (id, canal, texte) values (gen_random_uuid(), 'sms', 'Message de trop, doit etre refuse');
    raise exception 'limite de debit inactive';
  exception when raise_exception then raise notice 'OK 5 - limite de debit active';
  end;
end $$;
reset role;
delete from public.signalements;
-- 6. Purge des signalements de plus de 24 mois.
insert into public.signalements (id, canal, texte) values
  ('55555555-5555-4555-8555-555555555555', 'sms', 'Signalement ancien a purger'),
  ('66666666-6666-4666-8666-666666666666', 'sms', 'Signalement recent a garder');
update public.signalements set cree_le = now() - interval '25 months' where id = '55555555-5555-4555-8555-555555555555';
do $$ begin
  assert prive.purger() = 1, 'purge incorrecte';
  assert (select count(*) from public.signalements) = 1, 'le recent a disparu';
  raise notice 'OK 6 - purge a 24 mois';
end $$;
delete from public.signalements;

