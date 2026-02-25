export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl" role="img" aria-label="avião">✈️</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Travel Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Planeje sua viagem com IA</p>
        </div>
        {children}
      </div>
    </div>
  );
}
