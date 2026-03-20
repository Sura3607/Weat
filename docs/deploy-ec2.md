# Deploy Weat lên AWS EC2

## Yêu cầu

- AWS Account
- EC2 instance: **Ubuntu 22.04/24.04**, tối thiểu **t3.small** (2 vCPU, 2GB RAM)
- Security Group mở ports: **22** (SSH), **80** (HTTP), **443** (HTTPS)
- SSH key pair đã tạo

## Bước 1: Tạo EC2 Instance

1. Vào AWS Console > EC2 > Launch Instance
2. Chọn **Ubuntu Server 22.04 LTS** (hoặc 24.04)
3. Instance type: **t3.small** (hoặc t3.medium cho production)
4. Key pair: chọn hoặc tạo mới
5. Security Group:
   - SSH (22) - My IP
   - HTTP (80) - Anywhere
   - HTTPS (443) - Anywhere
6. Storage: 20GB gp3
7. Launch

## Bước 2: SSH vào EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## Bước 3: Setup môi trường

```bash
# Clone repo
git clone https://github.com/Sura3607/Weat.git
cd Weat

# Chạy setup script (cài Docker, Git, firewall)
bash scripts/setup-ec2.sh

# QUAN TRỌNG: Logout và login lại để Docker group có hiệu lực
exit
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd Weat
```

## Bước 4: Cấu hình environment

```bash
# Copy template
cp .env.production .env

# Sửa file .env
nano .env
```

Thay đổi các giá trị quan trọng:

| Biến | Giá trị |
|------|---------|
| `DB_PASSWORD` | Mật khẩu mạnh cho PostgreSQL |
| `JWT_SECRET` | Chuỗi random 64 ký tự |
| `CORS_ORIGIN` | `*` (demo) hoặc `http://YOUR_EC2_IP` |
| `NEXT_PUBLIC_API_URL` | `http://YOUR_EC2_IP/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `http://YOUR_EC2_IP` |
| `OPENAI_API_KEY` | (tùy chọn) API key OpenAI |

Tạo JWT_SECRET nhanh:
```bash
openssl rand -hex 32
```

## Bước 5: Deploy

```bash
bash scripts/deploy-ec2.sh
```

Script sẽ tự động:
1. Build Docker images
2. Khởi động PostgreSQL + Redis
3. Chạy database migration + seed
4. Khởi động Backend + Frontend + Nginx

## Bước 6: Kiểm tra

```bash
# Xem trạng thái containers
docker compose -f docker-compose.prod.yml ps

# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Test health
curl http://localhost/api/v1/health
```

Truy cập từ trình duyệt hoặc điện thoại:
- **Frontend:** `http://YOUR_EC2_IP`
- **API:** `http://YOUR_EC2_IP/api/v1/health`

## Kết nối từ điện thoại

1. Đảm bảo điện thoại có kết nối internet
2. Mở trình duyệt Chrome/Safari
3. Truy cập `http://YOUR_EC2_IP`
4. Đăng nhập với demo account hoặc tạo tài khoản mới
5. Cấp quyền camera + location khi được hỏi

## Quản lý

```bash
# Restart services
docker compose -f docker-compose.prod.yml restart

# Update code
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Stop all
docker compose -f docker-compose.prod.yml down

# Xóa data (CẢNH BÁO: mất hết dữ liệu)
docker compose -f docker-compose.prod.yml down -v
```

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Frontend trắng | Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env` |
| API 502 | `docker compose logs backend` - kiểm tra DB connection |
| WebSocket fail | Kiểm tra `NEXT_PUBLIC_WS_URL` và nginx ws config |
| Camera không mở | Cần HTTPS cho camera trên mobile (dùng ngrok hoặc SSL) |
| Build fail | Kiểm tra RAM - cần ít nhất 2GB |

## Lưu ý quan trọng về Camera trên Mobile

Camera API (`getUserMedia`) yêu cầu **HTTPS** trên mobile browsers (ngoại trừ localhost). Có 2 cách:

1. **Dùng ngrok** (nhanh, miễn phí cho demo):
   ```bash
   # Cài ngrok trên EC2
   snap install ngrok
   ngrok http 80
   # Sẽ có URL https://xxx.ngrok.io
   ```

2. **Cài SSL với Let's Encrypt** (cần domain):
   ```bash
   sudo apt install certbot
   # Cấu hình SSL trong nginx
   ```
