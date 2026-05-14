import { PasteForm } from "@/app/components/paste-form";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-3xl font-bold">paste.md</h1>
      <PasteForm />
    </main>
  );
}
