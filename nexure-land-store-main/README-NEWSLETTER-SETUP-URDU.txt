NEXURE&LAND NEWSLETTER SETUP

1. Supabase Dashboard kholen aur apna project select karein.
2. SQL Editor > New query par jayen.
3. newsletter-supabase-setup.sql ka poora code paste karke Run karein.
4. Website ki updated files GitHub par upload/deploy karein.
5. Website par newsletter mein apna test email submit karein.
6. Supabase > Table Editor > newsletter_subscribers mein check karein ke email save hua.
7. Wohi email dobara submit karein: duplicate subscription ka message aana chahiye.

Form ab browser ke localStorage mein demo email save nahi karta; email Supabase
newsletter_subscribers table mein save hota hai. Public users ko sirf INSERT
permission di gayi hai; subscribers ki list public website se read nahi hoti.

Note: SQL script run kiye baghair subscription save nahi hoga. Real customers ko
newsletter emails bhejne ke liye baad mein email service aur unsubscribe process
setup karna hoga. Sirf subscription record save hona email campaign send nahi karta.
