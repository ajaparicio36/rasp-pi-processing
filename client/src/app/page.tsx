import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <h1 className="mb-8 text-6xl font-bold text-center">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary glow-text">
          Rasp Pi Processing
        </span>
      </h1>
      <Button
        asChild
        className="text-lg px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/90"
      >
        <Link href="/audio">Audio Processing</Link>
      </Button>
    </main>
  );
}
