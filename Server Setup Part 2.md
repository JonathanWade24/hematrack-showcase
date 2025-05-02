04-28-2025 14:46
Status:
Tags:
# Server Setup Part 2


# References

# 🌐 Securely Hosting the Application (Facing the Internet)

This section covers the steps to make your Dockerized Next.js application (`hematrack`) securely accessible from the internet using your NUC as the host.

## Core Concepts Recap

*   **Docker Compose:** Manages the app container and potentially a local database container.
*   **Reverse Proxy:** Handles incoming internet traffic (ports 80/443), manages SSL, and forwards requests to the app container. (e.g., Nginx Proxy Manager, Caddy).
*   **HTTPS/SSL:** Essential for security, typically using Let's Encrypt certificates managed by the reverse proxy.
*   **Firewall (UFW):** Configured on the NUC to allow only necessary incoming ports (mainly 80/443 for the proxy, SSH for management).
*   **Dynamic DNS (DDNS):** Provides a stable domain name if your public IP changes.
*   **Port Forwarding:** Configured on your router to direct internet traffic (ports 80/443) to the NUC.
*   **Secure Remote Management:** Primarily SSH with key-based auth, potentially layered with VPN access.

## Step-by-Step Guide

### 1. Prepare Docker Compose (`docker-compose.yml`)

*   **Location:** Create a directory on your NUC (e.g., `/home/your_user/docker_apps/hematrack/`).
*   **File:** Create `docker-compose.yml` within that directory.
*   **Content:**
    *   Adapt the example provided previously (or create one based on it).
    *   Define your `app` service (`hematrack`), specifying the correct `image:` source (`hematrack:latest`, registry path, etc.).
    *   **Crucially, define all necessary runtime `environment:` variables** (NODE_ENV, DATABASE\_URL, NEXTAUTH\_URL, NEXTAUTH\_SECRET, etc.) using production values. Consider using Docker secrets or an `env_file:` for sensitive data instead of listing directly in the YAML.
    *   If hosting PostgreSQL locally on the NUC, include the `db` service definition with strong credentials and a persistent volume mapping (e.g., `- postgres_data:/var/lib/postgresql/data`). If using RDS, omit the `db` service and set the RDS URL in the `app` service's `DATABASE_URL`.
    *   Define Docker `networks` for communication (e.g., `hematrack-net`).
    *   Define Docker `volumes` for data persistence (e.g., `postgres_data`).

### 2. Set Up a Reverse Proxy (Choose One & Run via Docker Compose)

*   **Recommendation:** Nginx Proxy Manager (NPM) for ease of use.
*   **Setup:**
    *   Follow the official Docker setup guide for your chosen proxy (NPM, Caddy, Traefik).
    *   Typically involves adding another service definition to your `docker-compose.yml` or using a separate compose file.
    *   Map host ports 80 and 443 to the proxy container.
    *   Configure the proxy (via its web UI for NPM, or Caddyfile for Caddy) to:
        *   Listen for your public domain name (from DDNS or static IP).
        *   Forward requests to your app container's service name and port within the Docker network (e.g., `http://app:3000`).
        *   Obtain and manage Let's Encrypt SSL certificates for HTTPS.

### 3. Configure Firewall (UFW on NUC)

*   Allow traffic to the reverse proxy:
    ```bash
    sudo ufw allow proto tcp from any to any port 80,443 comment 'Allow HTTP/HTTPS for Reverse Proxy'
    ```
*   *(Recommended)* Remove direct access to the app's port (if previously allowed):
    ```bash
    # Check rule numbers first: sudo ufw status numbered 
    # sudo ufw delete <rule_number_for_3000>
    # OR
    # sudo ufw delete allow 3000/tcp 
    ```
*   Ensure SSH is allowed (usually `sudo ufw allow OpenSSH` or your custom port).
*   Reload UFW:
    ```bash
    sudo ufw reload
    ```

### 4. Configure Router Port Forwarding

*   Access your internet router's admin settings.
*   Find the "Port Forwarding" section.
*   Forward incoming **TCP port 80** to the **NUC's private IP address**, port **80**.
*   Forward incoming **TCP port 443** to the **NUC's private IP address**, port **443**.
    *   *(Find NUC IP via `ip addr show` or `ifconfig` on the NUC).* 

### 5. Set Up Dynamic DNS (DDNS) (If you don't have a static public IP)

*   Sign up for a DDNS service (e.g., DuckDNS, No-IP).
*   Configure your router or a client on the NUC (e.g., `ddclient`) to update the DDNS service with your current public IP address.
*   Use the DDNS hostname (e.g., `my-hematrack.duckdns.org`) in your reverse proxy configuration.

### 6. Secure Remote Management

*   **SSH:**
    *   **Mandatory:** Use **key-based authentication only** (password auth should be disabled via your setup script).
    *   **(Optional Security):** Change the default SSH port (22) in `/etc/ssh/sshd_config` and update UFW rules accordingly (`ufw allow <new_port>/tcp`, `ufw delete allow OpenSSH`). Connect using `ssh -p <new_port> ...`.
*   **VPN Access (Choose One):**
    *   **Use Existing VPN:** If your existing VPN (like Emory's) allows you to reliably access the NUC's private IP when connected, this can be sufficient for SSH access without exposing SSH directly to the internet (don't port forward SSH in this case).
    *   **Self-Hosted VPN (Recommended for dedicated access):** Install WireGuard or Tailscale on the NUC. Configure authorized client devices. Connect to the NUC using its VPN IP address for SSH or accessing other management tools (like Portainer). This avoids exposing SSH/management ports on your main router/firewall.
*   **Web Management UI (e.g., Portainer):**
    *   If used, run it as a Docker container.
    *   **Crucially:** Do **NOT** expose or port forward its web UI port to the public internet.
    *   Access it *only* via SSH tunneling or your secure management VPN.
    *   Use a very strong password for the Portainer admin account.

### 7. Start Services

*   Navigate to the directory containing your `docker-compose.yml` file on the NUC.
*   Start all defined services (app, database, reverse proxy):
    ```bash
    docker-compose up -d
    ```
*   Check logs: `docker-compose logs -f <service_name>` (e.g., `docker-compose logs -f app`).

Your application should now be securely accessible via HTTPS at your configured domain name, and your NUC should be reasonably secured for remote management.