export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">AgentForge</h1>
      <p className="text-lg">Local-First AI Agent Platform</p>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Status</h2>
        <ul className="list-disc ml-6">
          <li>API: Running on port 8000</li>
          <li>Web: Running on port 3000</li>
          <li>Database: PostgreSQL</li>
          <li>Cache: Redis</li>
        </ul>
      </div>
    </main>
  );
}