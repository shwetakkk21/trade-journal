# Trade Journal

A modern, full-stack application for tracking and analyzing your trading portfolio across multiple demat accounts. Built with React, Vite, and Firebase, Trade Journal provides comprehensive insights into your investment performance and trading patterns.

🌐 **Live Demo**: https://trade-journal-theta-five.vercel.app/

## Features

- **Multi-Demat Portfolio Tracking** - Manage holdings across multiple brokerage accounts
- **Trade Analytics** - Visualize and analyze your trading performance with interactive charts
- **Real-time Updates** - Firebase-powered real-time data synchronization
- **Responsive Dashboard** - Beautiful, mobile-friendly UI built with React and Tailwind CSS
- **Cloud Functions** - Serverless backend for secure data processing
- **Google Sheets Integration** - Sync portfolio data with Google Sheets

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Interactive data visualization
- **Lucide React** - Beautiful icon library
- **Firebase** - Authentication and real-time database

### Backend
- **Firebase Cloud Functions** - Serverless computing
- **Firebase Admin SDK** - Server-side Firebase operations
- **Google APIs** - Google Sheets integration
- **Node.js 18** - Runtime environment

## Project Structure

```
trade-journal/
├── src/                    # React frontend source code
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   └── App.jsx             # Main application component
├── functions/              # Firebase Cloud Functions
│   └── index.js            # Cloud function handlers
├── public/                 # Static assets
├── package.json            # Frontend dependencies
└── functions/package.json  # Cloud Functions dependencies
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Firebase account
- Google Cloud project (for Sheets integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shwetakkk21/trade-journal.git
   cd trade-journal
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install Cloud Functions dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```

4. **Set up environment variables**
   Create a `.env.local` file in the root directory with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### Development

**Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Run linting:**
```bash
npm run lint
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

### Firebase Cloud Functions

**Start Firebase emulator:**
```bash
cd functions
npm run serve
```

**Deploy Cloud Functions:**
```bash
cd functions
npm run deploy
```

## Usage

1. **Sign up/Sign in** - Create your account or log in with existing credentials
2. **Add Accounts** - Link your demat/brokerage accounts
3. **Import Trades** - Upload trade data or import from Google Sheets
4. **View Dashboard** - Analyze your portfolio performance with interactive charts
5. **Track Performance** - Monitor P&L, returns, and trading metrics

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint checks |
| `npm run preview` | Preview production build |

## Deployment

This project is deployed on **Vercel**. Any push to the main branch will trigger an automatic deployment.

**Manual deployment:**
```bash
npm run build
# Deploy the dist/ folder to Vercel
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or suggestions, please open an [issue](https://github.com/shwetakkk21/trade-journal/issues) on GitHub.

---

**Made with ❤️ by [shwetakkk21](https://github.com/shwetakkk21)**
