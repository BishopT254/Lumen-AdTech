# Lumen AI-Powered Smart AdTech Platform

Lumen is a cutting-edge, AI-powered Smart AdTech Platform that enables performance-based digital advertising primarily through Android TV applications deployed in public spaces, transportation vehicles, and retail environments. The platform leverages artificial intelligence, real-time analytics, and IoT integration to provide a revolutionary advertising experience.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **State Management**: React Context API
- **Form Validation**: Zod
- **API Communication**: REST APIs
- **Charting**: Recharts / Chart.js
- **AI Integration**: TensorFlow.js

## Core Features

- **Role-Based Access**: Different dashboards for Advertisers, Partners, and Admins
- **Performance-Based Pricing**: Pay per impression, engagement, or conversion
- **Campaign Management**: Create, monitor, and optimize advertising campaigns
- **Device Management**: Register and monitor Android TV devices
- **Analytics**: Real-time performance tracking with interactive dashboards
- **AI-Powered Audience Estimation**: Privacy-preserving audience metrics
- **Secure Authentication**: JWT-based authentication with role authorization

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/lumen-adtech.git
cd lumen-adtech
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the `.env.example` file to `.env.local` and update the variables:

```bash
cp .env.example .env.local
```

4. **Set up the database**

The project uses PostgreSQL with Prisma ORM. Set up your database connection in the `.env.local` file:

```
DATABASE_URL="postgresql://username:password@localhost:5432/lumen_adtech"
```

5. **Run database migrations**

```bash
npx prisma migrate dev
```

6. **Start the development server**

```bash
npm run dev
```

## Production Deployment

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- SMTP server for email capabilities
- AWS S3 bucket or equivalent for media storage
- SSL certificate for production domain

### Deployment Steps

1. **Set Environment Variables**

Ensure all production environment variables are correctly set, including:

```
# Database
DATABASE_URL="postgresql://username:password@host:port/lumen_adtech"

# Next Auth
NEXTAUTH_SECRET="your-secure-secret-key"
NEXTAUTH_URL="https://your-production-domain.com"

# Media Storage
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="lumen-adtech-media"

# Other services
# Add credentials for payment gateways, etc.
```

2. **Build the Application**

```bash
npm run build
```

3. **Database Migration**

Run Prisma migrations to prepare your production database:

```bash
npx prisma migrate deploy
```

4. **Start the Production Server**

```bash
npm run start
```

For a more robust deployment, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm -- start
```

### Deployment with Docker

A `Dockerfile` and `docker-compose.yml` are provided for containerized deployment:

1. **Build the Docker image**

```bash
docker build -t lumen-adtech .
```

2. **Run with Docker Compose**

```bash
docker-compose up -d
```

## Monitoring and Maintenance

- **Performance Monitoring**: The application includes server-side API monitoring with logs.
- **Error Handling**: All API routes include consistent error handling and logging.
- **Database Backups**: Configure regular PostgreSQL backups for disaster recovery.
- **Security Updates**: Keep dependencies updated regularly with `npm audit fix`.

## Testing

Run tests with:

```bash
npm test
```

## Security Considerations

- All API routes include authentication and authorization checks
- User passwords are hashed using bcrypt
- HTTPS is enforced for all connections
- JWT tokens with short expiration times
- Security headers are configured in Next.js config
- CORS is properly configured for API routes
- Database queries are parameterized through Prisma

## License

Proprietary - All rights reserved

---

For more detailed documentation, refer to the [DOCUMENTATION.md](./DOCUMENTATION.md) file.
