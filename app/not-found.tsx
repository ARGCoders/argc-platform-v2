import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-20 pt-nav text-center">
      <p className="font-mono text-[0.72rem] tracking-[0.12em] uppercase text-muted-foreground">
        404
      </p>

      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>

      <p className="max-w-prose text-sm text-muted-foreground">
        That page does not exist, or it has moved.
      </p>

      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  )
}
