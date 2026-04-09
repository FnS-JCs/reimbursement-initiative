# FnS Reimbursement App

Reimbursement Management App for Finance & Strategy Department, The Placement Cell, SRCC.

## Features

- **Bill Submission**: JCs and SCs can submit expense bills with file uploads
- **Reimbursement Tracking**: SCs can mark bills as physically received and reimbursed
- **Bill Rejection**: SCs can reject bills with mandatory reasons
- **FnS Admin Portal**: Full management of users, cycles, dropdowns, and bills
- **Excel Export**: Export filtered bills to Excel format for admin office submission

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI**: shadcn/ui components
- **Excel Export**: xlsx library

## Prerequisites

1. Node.js 18+ installed
2. A Supabase project created at https://supabase.com

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd app
npm install
```

### 2. Set Up Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration script from `supabase/migrations/001_initial_schema.sql`
4. Create a storage bucket named `bill-uploads` (private)

### 3. Configure Environment Variables

Copy the example env file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Update `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key (found in Project Settings > API)

### 4. Set Up Authentication

In your Supabase dashboard:

1. Go to **Authentication** > **Providers**
2. Enable **Google** sign-in
3. Configure your Google OAuth credentials and redirect URLs

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First-Time Setup

1. Make sure the user's Google-account email is listed in the `users` table with the correct role
2. The user signs in with Google
3. The app checks the signed-in email against the whitelist
4. Whitelisted users are redirected to the correct dashboard by role

## Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # JC/SC dashboard
│   │   ├── fns/               # FnS admin portal
│   │   └── components/        # Shared components
│   ├── lib/                   # Utilities
│   ├── supabase/              # Supabase client configuration
│   ├── types/                 # TypeScript types
│   └── ui/                    # shadcn/ui components
├── supabase/
│   └── migrations/            # Database migrations
└── .env.local                 # Environment variables
```

## User Roles

- **JC (Junior Coordinator)**: Submit bills, view own bills
- **SC (Senior Coordinator)**: Submit bills, manage JC bills, mark reimbursement status
- **FnS**: Full admin access - manage users, cycles, dropdowns, all bills, and exports

## Bill Workflow

1. JC/SC submits bill → Bill created with `physical_received=false`, `is_reimbursed=false`
2. SC receives physical bill → Marks as `physical_received=true`
3. SC reimburses JC via UPI → Marks as `is_reimbursed=true`
4. FnS collects bills monthly → Exports to Excel for admin office

## License

Internal use only - The Placement Cell, SRCC
