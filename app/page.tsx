import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-8 gap-4">
      <h1 className="text-4xl font-bold tracking-tight">TransitOps Base Initialization</h1>
      <p className="text-muted-foreground">Next.js 14 + Tailwind CSS + shadcn/ui + Prisma</p>
      
      <div className="mt-8 border p-8 rounded-lg flex flex-col items-center gap-4">
        <p className="text-sm font-medium">Verify shadcn/ui styling:</p>
        <Button size="lg">I am a shadcn/ui Button</Button>
      </div>
    </div>
  );
}
