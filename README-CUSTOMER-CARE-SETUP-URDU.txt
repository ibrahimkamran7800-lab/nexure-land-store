NEXURE&LAND — Customer Care setup

1) Sab se pehle customer-care-supabase.sql file kholo.
2) Supabase Dashboard > SQL Editor > New query kholo.
3) SQL file ka poora code paste karke Run dabao.
4) SQL successful ho jaye to website ka updated ZIP GitHub repository mein upload/deploy karo.
5) Customer account se sign in karke My Account > Customer Care kholo aur test message bhejo.
6) Admin account se Admin access kholo > Customer Care tab mein ja kar reply bhejo.
7) Customer account mein wapas ja kar reply check karo.

Zaroori:
- Customer Care messages ke liye customer_care_messages table zaroori hai.
- RLS policies sirf customer ko uske apne messages aur admin role ko tamam messages/replies ki ijazat deti hain.
- Admin account ke public.profiles row mein role = 'admin' hona chahiye.
- Existing order checkout aur WhatsApp order confirmation is update mein change nahi ki gayi.
- SQL chalaye baghair Customer Care message send/load nahi hoga.
