import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

/**
 * Generic placeholder page for routes/features that exist as links
 * in the UI but aren't built out yet (e.g. Forgot Password, Terms, Privacy).
 *
 * Usage: <ComingSoon title="Forgot password" description="..." />
 */
export default function ComingSoon({ title, description }) {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Construction className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button className="mt-2 h-10" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}