# CashRouteAI — Production Deployment Guide

**CashRouteAI: Intraday Cash Intelligence & Dynamic Route Optimization**

This guide provides step-by-step instructions for deploying CashRouteAI across multiple environments:
1. **Option 1: 1-Click Free Cloud (Render.com or Railway)** — *Recommended for hackathon demos & presentations*
2. **Option 2: Public Live Sharing in 30 Seconds (Ngrok / Cloudflare Tunnel)** — *Fastest way to share your running local demo*
3. **Option 3: Docker & Docker Compose** — *For any cloud VPS (AWS, GCP, DigitalOcean)*
4. **Option 4: Traditional Linux Server (Ubuntu, Nginx, Gunicorn, Systemd)**
5. **Option 5: Google Cloud Run (Serverless Container)**

---

## Architecture Overview Before Deploying
- **Backend**: Python 3.10+ Flask application with OR-Tools CVRP solver, CatBoost ML model, and Google Gemini AI Copilot.
- **Frontend**: Vanilla HTML5, CSS3 (Tactile Claymorphism), and Vanilla JavaScript (Leaflet.js + Google Maps layer, Chart.js). All served statically by Flask from `/frontend`.
- **Database**: SQLite3 stored at `database/cashrouteai.db` (auto-initializes if missing).
- **ML Artifacts**: Pre-trained CatBoost model at `models/cashrouteai_demand_model.joblib`.
- **Port**: Configured dynamically via environment variable `PORT` (default `5000`).

---

## Option 1: Deploy to Render.com (Easiest & Free Cloud Hosting)

Render automatically detects Python applications and uses `Procfile` / `render.yaml`.

### Steps:
1. **Push your code to GitHub / GitLab**:
   ```bash
   git init
   git add .
   git commit -m "Deploy CashRouteAI"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cashrouteai.git
   git push -u origin main
   ```
2. **Open [Render.com](https://render.com/)** and sign in.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the following settings:
   - **Name**: `cashrouteai`
   - **Environment**: `Python 3`
   - **Region**: Closest to you (e.g., Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Plan**: `Free`
6. Under **Advanced** -> **Add Environment Variable**:
   - `GOOGLE_API_KEY`: `AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM`
   - `PYTHON_VERSION`: `3.10.12`
7. Click **Create Web Service**.
   Render will build the app and provide a live public HTTPS URL (e.g. `https://cashrouteai.onrender.com`).

---

## Option 2: Live Sharing in 30 Seconds via Ngrok or Cloudflare Tunnel
If your app is already running locally on port 5000 (`http://127.0.0.1:5000`) and you need an instant public URL to share with hackathon judges or on your phone:

### Using Cloudflare Tunnel (Zero Sign-up):
```bash
npx cloudflared tunnel --url http://127.0.0.1:5000
```
This prints an instant secure public HTTPS URL (e.g., `https://random-word-abc.trycloudflare.com`) accessible worldwide.

### Using Ngrok:
```bash
ngrok http 5000
```
Copy the Forwarding URL (`https://your-domain.ngrok-free.app`).

---

## Option 3: Docker & Docker Compose (Any Cloud VPS)

The project includes pre-configured `Dockerfile` and `docker-compose.yml`.

### Using Docker Compose:
```bash
docker compose up -d --build
```
Verify the container:
```bash
docker ps
```
Access at `http://YOUR_SERVER_IP:5000`.

### Manual Docker Build & Run:
```bash
# Build the image
docker build -t cashrouteai:latest .

# Run the container
docker run -d -p 5000:5000 \
  -e GOOGLE_API_KEY="AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM" \
  --name cashrouteai_container \
  cashrouteai:latest
```

---

## Option 4: Linux VPS (Ubuntu 22.04 / 24.04 with Nginx + Gunicorn)

### 1. Update Server & Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nginx libgomp1 build-essential
```

### 2. Clone Repository & Setup Virtual Environment
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/cashrouteai.git
cd cashrouteai
sudo chown -R $USER:$USER /var/www/cashrouteai

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Create Systemd Service
Create `/etc/systemd/system/cashrouteai.service`:
```ini
[Unit]
Description=CashRouteAI Gunicorn Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/cashrouteai
Environment="PATH=/var/www/cashrouteai/venv/bin"
Environment="PORT=5000"
Environment="GOOGLE_API_KEY=AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM"
ExecStart=/var/www/cashrouteai/venv/bin/gunicorn app:app --bind 127.0.0.1:5000 --workers 3 --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cashrouteai
sudo systemctl start cashrouteai
sudo systemctl status cashrouteai
```

### 4. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/cashrouteai`:
```nginx
server {
    listen 80;
    server_name your-domain.com YOUR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cashrouteai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Add Free SSL Certificate (HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Option 5: Google Cloud Run (Serverless Container)

### 1. Build and Submit to Google Artifact Registry:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cashrouteai
```

### 2. Deploy to Cloud Run:
```bash
gcloud run deploy cashrouteai \
  --image gcr.io/YOUR_PROJECT_ID/cashrouteai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars GOOGLE_API_KEY=AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM
```

---

## Post-Deployment Smoke Test Checklist
After deployment, run the automated verification script to confirm all services are functional:
```bash
python verify_full_system.py
```
Or test via `curl`:
```bash
curl -I https://YOUR_DEPLOYED_URL/api/config
curl https://YOUR_DEPLOYED_URL/api/dashboard
```
All components will report online!
