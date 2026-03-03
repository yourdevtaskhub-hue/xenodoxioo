# 🚨 ΑΜΕΣΗ ΔΙΟΘΩΡΣΗ NETLIFY

## Πρόβλημα
Λείπει το `VITE_API_URL` από τα environment variables του Netlify.

## ΛΥΣΗ - 2 ΛΕΠΤΑ

### 1. Πηγαίνετε στο Netlify
https://app.netlify.com/sites/incredible-panda-05f89b/settings/env

### 2. Προσθέστε ΑΥΤΟ το variable:
```
VITE_API_URL = https://incredible-panda-05f89b.netlify.app/api
```

### 3. Κάντε Redeploy
1. Πηγαίνετε στο tab **Deploys**
2. Πατήστε **Trigger deploy** → **Deploy site**

### 4. Περιμένετε 2-3 λεπτά

**Αυτό ήταν!** Θα πρέπει να λειτουργεί μετά το redeploy!

---

## ΟΛΑ τα Variables που πρέπει να έχετε:

```
SUPABASE_URL = https://jkolkjvhlguaqcfgaaig.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2xranZobGd1YXFjZmdhYWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NTkxNywiZXhwIjoyMDg4MDMxOTE3fQ.5D-FyZYezZ1w4HOPQco3XMjBJUrL52LbZudwR8WH8kU
NEXT_PUBLIC_SUPABASE_URL = https://jkolkjvhlguaqcfgaaig.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2xranZobGd1YXFjZmdhYWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTU5MTcsImV4cCI6MjA4ODAzMTkxN30.xCGZEuL4_AjrUY6Yi7BuPCzL1fYAWq9BB_BQ14GGIqQ
VITE_API_URL = https://incredible-panda-05f89b.netlify.app/api
NODE_ENV = production
FRONTEND_URL = https://incredible-panda-05f89b.netlify.app
```

**Το πιο σημαντικό είναι το VITE_API_URL!**
