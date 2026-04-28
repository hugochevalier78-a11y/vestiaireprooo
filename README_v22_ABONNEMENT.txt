VestiairePro v22 — Abonnement 4,99€/mois

Base : v21 Supabase basée sur v13, sans IA photo.

Ajouts :
- fenêtre d’abonnement à 4,99 €/mois ;
- message juste après création du compte : essai gratuit pendant 1 jour seulement ;
- bouton abonnement dans l’écran accès expiré ;
- bouton abonnement dans le profil ;
- création d’une session Stripe Checkout ;
- vérification du paiement Stripe au retour, puis passage du profil en status = paid.

Variables Netlify nécessaires :
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_PRICE_ID

STRIPE_PRICE_ID doit correspondre à un prix Stripe récurrent mensuel de 4,99 €.

À faire :
1. Mets tous les fichiers dans GitHub.
2. Vérifie que netlify/functions contient :
   - supabase-config.js
   - check-access.js
   - admin-users.js
   - update-user-status.js
   - create-checkout-session.js
   - verify-checkout.js
3. Ajoute les variables dans Netlify.
4. Redéploie.
5. Teste avec un compte utilisateur.
