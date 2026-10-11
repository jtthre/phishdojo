-- Tests d'attaque sur la base, du point de vue du role public (anon) que tout visiteur detient.
-- Chaque bloc tente une action interdite et verifie qu'elle est refusee.
\set QUIET on

set role anon;
do $$ begin
  -- 1. le schema prive (cle HMAC, fonctions internes) est inaccessible
  begin perform valeur from prive.cle; raise exception 'cle HMAC lisible';
  exception when insufficient_privilege then raise notice 'OK A1 - cle HMAC illisible'; end;
  begin perform prive.purger(); raise exception 'purge appelable';
  exception when insufficient_privilege then raise notice 'OK A2 - purge non appelable'; end;
  begin perform prive.remasquer('x'); raise exception 'fonction interne appelable';
  exception when insufficient_privilege then raise notice 'OK A3 - fonctions internes non appelables'; end;

  -- 2. upsert (insert ... on conflict do update) : necessiterait UPDATE, refuse
  begin
    insert into public.signalements (id, canal, texte) values ('77777777-7777-4777-8777-777777777777', 'sms', 'Premier envoi legitime ici');
    insert into public.signalements (id, canal, texte) values ('77777777-7777-4777-8777-777777777777', 'sms', 'Ecrasement par upsert !!')
      on conflict (id) do update set texte = excluded.texte;
    raise exception 'upsert autorise';
  exception when insufficient_privilege then raise notice 'OK A4 - upsert refuse';
  end;

  -- 3. suppression directe (hors fonction prevue) refusee
  begin delete from public.signalements; raise exception 'suppression directe autorisee';
  exception when insufficient_privilege then raise notice 'OK A5 - suppression directe refusee'; end;

  -- 4. limites de taille
  begin insert into public.signalements (id, canal, texte) values (gen_random_uuid(), 'sms', repeat('a', 2001)); raise exception 'texte geant accepte';
  exception when check_violation then raise notice 'OK A6 - texte trop long refuse'; end;
  begin insert into public.signalements (id, canal, texte, domaines)
        values (gen_random_uuid(), 'sms', 'Trop de domaines ici', array(select 'd' || g || '.top' from generate_series(1, 21) g));
        raise exception 'trop de domaines acceptes';
  exception when check_violation then raise notice 'OK A7 - trop de domaines refuses'; end;

  -- 5. le role public ne peut pas desactiver les declencheurs
  begin set session_replication_role = replica; raise exception 'declencheurs desactivables';
  exception when insufficient_privilege then raise notice 'OK A8 - declencheurs non desactivables'; end;

  -- 6. suppression avec un identifiant nul ou inconnu : rien ne se passe
  assert public.supprimer_signalement(null) = false;
  assert public.supprimer_signalement('00000000-0000-4000-8000-000000000000') = false;
  raise notice 'OK A9 - suppression sans identifiant valide sans effet';
end $$;

-- 7. contournements du masquage : chiffres pleine chasse, caracteres invisibles, injection SQL dans le texte
insert into public.signalements (id, canal, texte, expediteur) values
  ('88888888-8888-4888-8888-888888888888', 'sms', 'Appelez le ７７ １２３ ４５ ６７ ou 78' || chr(8203) || '111' || chr(8204) || '22' || chr(8288) || '33', 'pas un numero'),
  ('99999999-9999-4999-8999-999999999999', 'sms', 'x''); drop table public.signalements; -- et 771234567', null);
reset role;

do $$
declare t text; e text;
begin
  select texte, expediteur_empreinte into t, e from public.signalements where id = '88888888-8888-4888-8888-888888888888';
  assert t !~ '[0-9]{3}', 'contournement non masque : ' || t;
  assert e is null, 'empreinte calculee sur un numero invalide';
  raise notice 'OK A10 - chiffres pleine chasse et invisibles remasques : %', t;
  select texte into t from public.signalements where id = '99999999-9999-4999-8999-999999999999';
  assert to_regclass('public.signalements') is not null, 'table supprimee';
  assert t ~ 'drop table' and t !~ '771234567', 'injection stockee comme texte, numero masque';
  raise notice 'OK A11 - injection SQL stockee comme simple texte';
end $$;

-- 8. la ligne ecrite ne garde jamais l'expediteur en clair, meme si l'insertion contourne le client
do $$ begin
  assert not exists (select 1 from public.signalements where expediteur is not null), 'expediteur stocke';
  raise notice 'OK A12 - aucun expediteur en clair en base';
end $$;

delete from public.signalements;
\echo 'Tous les tests SQL sont passes.'
