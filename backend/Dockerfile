FROM python:3.11.9-slim-bookworm

# Environment setup
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y \
    wget curl gnupg2 ca-certificates fonts-liberation libappindicator3-1 libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 \
    libnspr4 libnss3 libxcomposite1 libxdamage1 libxrandr2 xdg-utils libgbm1 \
    libgtk-3-0 libxshmfence1 libxss1 lsb-release && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Install Playwright and its browser binaries
RUN playwright install --with-deps

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]