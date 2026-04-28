
VestiairePro v21 Supabase — basé sur v13, sans IA photo

Cette version garde l'interface de la v13, donc pas de fonction d'IA photo.
Ajouts :
- vrais comptes Supabase
- essai gratuit de 24h
- blocage automatique après 24h
- synchronisation des données via user_data
- page admin pour voir/bloquer/débloquer les utilisateurs

À faire :
1. Supabase > SQL Editor : lance supabase_schema_v21.sql.
2. Netlify > Environment variables : ajoute :
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Supabase > Authentication > URL Configuration :
   - Site URL : ton lien Netlify
   - Redirect URL : ton lien Netlify
4. GitHub : mets tout le contenu du dossier dans ton repo.
5. Netlify : redéploie depuis GitHub.
6. Crée ton compte sur VestiairePro.
7. Supabase > SQL Editor :
   update profiles set is_admin = true, status = 'paid' where email = 'tonmail@example.com';

Important :
- Ne mets jamais SUPABASE_SERVICE_ROLE_KEY dans GitHub ou index.html.
- Elle doit rester seulement dans Netlify Environment variables.
