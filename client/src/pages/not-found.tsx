import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-amber-900 mb-4">404</h1>
        <p className="text-2xl text-amber-800 mb-8">Page not found</p>
        <Link href="/">
          <Button className="bg-orange-500 hover:bg-orange-600">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}