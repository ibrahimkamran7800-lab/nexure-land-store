NEXURE&LAND — ADMIN ACCESS SETUP

1) Supabase Dashboard > SQL Editor > New query kholen.
2) admin-access-setup.sql ka poora code paste karke Run karein.
3) Confirm karein ke SQL successful hua.
4) Updated website files GitHub par upload/deploy karein.
5) Apne pehle se authorised Admin account se website mein sign in karein.
6) Footer > Admin access > Admin Access tab kholen.
7) Jis shakhs ko Admin banana ho, uska pehle se bana hua normal Customer account select karein.
8) Admin access select karke Save account access dabayen.

Security:
- Public customers ko Admin Access tab nahi dikhta.
- Customer signup se role hamesha customer hi rehna chahiye.
- Sirf existing profiles.role='admin' account database function chala sakta hai.
- Function sirf pehle se registered profile ka role badalta hai; naya Auth account create nahi karta.
- Apna Supabase service_role/secret key kabhi website files mein na rakhein.
- Agar current owner account profiles table mein pehle se role='admin' nahi hai, pehle trusted server-side setup se initial admin role set karna hoga.
