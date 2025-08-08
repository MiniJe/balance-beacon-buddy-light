# Balance Beacon Buddy Light 🚀

Complete partner management and email system with document generation and confirmation workflow.

## 🌟 Features

### Core Functionality
- **Partner Management**: Complete CRUD operations for business partners
- **Email System**: SMTP integration with email tracking and logging
- **PDF Generation**: Advanced document generation with template support
- **Confirmation Workflow**: 4-step process for document confirmation requests
- **Session Management**: JWT-based authentication with comprehensive logging
- **File Upload**: Secure document handling and storage

### Technical Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with comprehensive schema
- **Email**: SMTP integration (Zoho configured)
- **PDF**: Advanced generation with template system
- **Authentication**: JWT with role-based permissions

## 🗄️ Database Schema

- **JurnalCereriConfirmare**: Confirmation request tracking
- **JurnalEmail**: Email activity logging
- **JurnalSesiuni**: Session management
- **JurnalDocumenteEmise**: Document tracking
- **Parteneri**: Partner management
- **Utilizatori**: User management
- **Templates**: Document templates and configurations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/balance-beacon-buddy-light.git
cd balance-beacon-buddy-light

# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp .env.example .env

# Start development servers
npm run dev
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📁 Project Structure

```
balance-beacon-buddy-light/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Application pages
│   │   ├── services/        # API services
│   │   └── hooks/           # Custom React hooks
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   └── utils/           # Utility functions
└── docker-compose.yml       # Docker configuration
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
PORT=5000
JWT_SECRET=your-jwt-secret
SMTP_HOST=smtp.zoho.eu
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:5000
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Partners
- `GET /api/parteneri` - Get partners list
- `POST /api/parteneri` - Create partner
- `PUT /api/parteneri/:id` - Update partner
- `DELETE /api/parteneri/:id` - Delete partner

### Email System
- `POST /api/email/send` - Send email
- `GET /api/jurnal-email` - Get email logs

### Documents
- `POST /api/pdf/generate` - Generate PDF
- `POST /api/upload` - Upload document

## 🎯 Workflow

### 4-Step Confirmation Process
1. **Select Partners**: Choose partners for confirmation requests
2. **Configure & Generate**: Set up email templates and generate documents
3. **Upload Files**: Upload generated or custom documents
4. **Review & Send**: Final review and email dispatch with tracking

## 🔐 Security Features

- JWT-based authentication
- Role-based permissions
- Input validation and sanitization
- SQL injection prevention
- File upload security
- Session management with timeout

## 🌍 Localization

- **Timezone**: Romania (Europe/Bucharest) with DST support
- **Language**: Romanian interface with English technical docs
- **Date Format**: DD.MM.YYYY HH:mm:ss

## 📊 Monitoring & Logging

- Comprehensive email tracking
- Session activity logging
- Error logging and monitoring
- Performance metrics
- Audit trail for all operations

## 🚀 Deployment

Ready for production deployment with:
- Docker containerization
- Environment-based configuration
- Production-optimized builds
- Database migrations
- Health checks

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📞 Support

For support and questions, please contact: dev.light@freshcrm.ro

---

**Balance Beacon Buddy Light** - Complete business partner management solution 🎯
