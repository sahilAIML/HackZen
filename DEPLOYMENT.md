# 🚀 Deployment Guide: CashRouteAI

Refer to the main [DEPLOYMENT.md](file:///d:/CashRoute_NEC/DEPLOYMENT.md) in the project root for full instructions.

### Quick Commands for Render:
- **Root Directory**: `ai`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --workers 2 --timeout 120 --bind 0.0.0.0:$PORT`
- **Environment**: `PYTHON_VERSION=3.11.9`

### Quick Commands for Vercel:
```bash
# Inside the ai/ directory:
vercel
# Follow prompts, then:
vercel --prod
```
