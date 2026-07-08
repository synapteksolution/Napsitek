# Deployment Guide — napsitek.com

## Architecture

```
GitHub (push to main)
    │
    ▼
GitHub Actions ──rsync──▶ VPS (/var/www/napsitek.com/)
                              │
                              ▼
                          Caddy (auto HTTPS + file_server)
                              │
                              ▼
                        napsitek.com ✅
```

Caddy handles HTTPS automatically via Let's Encrypt — zero certificate management needed.

---

## 1. VPS Setup (run once)

SSH into your VPS and run these commands:

### 1.1 Install Caddy

```bash
sudo apt update && sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo apt update && sudo apt install -y caddy
```

### 1.2 Create the web root directory

```bash
sudo mkdir -p /var/www/napsitek.com
sudo chown -R caddy:caddy /var/www/napsitek.com
```

### 1.3 Copy the Caddyfile

Upload the `deploy/Caddyfile` from this repo to the VPS:

```bash
# From your LOCAL machine
scp deploy/Caddyfile your_user@YOUR_VPS_IP:/tmp/Caddyfile

# Then on the VPS
sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

### 1.4 Verify Caddy is running

```bash
sudo systemctl status caddy
```

You should see `active (running)`. Caddy will automatically provision the SSL certificate for `napsitek.com` on first request.

---

## 2. Create a deploy user for GitHub Actions

> **IMPORTANT**: Do NOT use `root` for deployments. Create a dedicated user with minimal permissions.

```bash
# Create user with no password login
sudo adduser --disabled-password --gecos "" deploy

# Give deploy user write access to the web root
sudo chown -R deploy:deploy /var/www/napsitek.com

# Generate an SSH key pair for the deploy user
sudo su - deploy
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""

# Authorize the public key
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Print the PRIVATE key — you'll need this for GitHub Secrets
cat ~/.ssh/deploy_key

# Exit the deploy user
exit
```

> **CAUTION**: Copy the private key output carefully. You will paste it into GitHub Secrets in the next step. After that, you can delete the private key file from the VPS:
> ```bash
> sudo rm /home/deploy/.ssh/deploy_key
> ```

---

## 3. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Create these three secrets:

| Secret Name    | Value                                                |
|----------------|------------------------------------------------------|
| `VPS_HOST`     | Your VPS IP address (e.g., `123.45.67.89`)           |
| `VPS_USER`     | `deploy`                                             |
| `VPS_SSH_KEY`  | The full private key from the previous step (including `-----BEGIN...` and `-----END...` lines) |

---

## 4. DNS (already done)

You mentioned the `A` record for `napsitek.com` already points to your VPS.

> **TIP**: If you want `www.napsitek.com` to also work (the Caddyfile includes a redirect), add a second record in Hostinger:
> - **Type**: CNAME
> - **Name**: www
> - **Value**: napsitek.com

---

## 5. Firewall

Make sure ports **80** and **443** are open on your VPS. Caddy needs port 80 for the ACME HTTP challenge (Let's Encrypt cert provisioning):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp    # SSH — don't lock yourself out!
sudo ufw enable
sudo ufw status
```

---

## 6. Deploy!

Push to `main` and watch it go:

```bash
git add .
git commit -m "ci: add deploy pipeline and Caddy config"
git push origin main
```

Go to **GitHub → Actions** tab to monitor the workflow. First deploy takes ~1-2 minutes.

---

## Troubleshooting

### Certificate not provisioning
- Verify DNS is resolving: `dig napsitek.com` should return your VPS IP
- Check Caddy logs: `sudo journalctl -u caddy --no-pager -n 50`
- Make sure port 80 is open (Let's Encrypt uses HTTP challenge)

### rsync permission denied
- Verify the `deploy` user can write to `/var/www/napsitek.com/`
- Check `~/.ssh/authorized_keys` has the correct public key
- Test SSH manually: `ssh -i deploy_key deploy@YOUR_VPS_IP`

### 404 on routes (e.g., `/about`)
- The Caddyfile `try_files` directive handles SPA routing. If you see 404s, verify the Caddyfile was loaded: `sudo caddy validate --config /etc/caddy/Caddyfile`
