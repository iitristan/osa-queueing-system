import Image from "next/image";
import Link from 'next/link'

export default function Home() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <nav className="bg-[#111111] border-[#FCBF15] border-b-4">
        <Link href="/admin">
        <Image
          src="/osa_header.png"
          alt="UST Logo"
          width={500}
          height={200}
          className="p-3"
        />
        </Link>
      </nav>
      <div className="grid grid-cols-2 gap-1 h-full">
        <div className="flex flex-col justify-center items-center bg-[#D0D0D0]">
          <h1 className="text-4xl font-bold">Now Serving</h1>
          <h1 className="text-9xl font-bold">S07</h1>
          <h1 className="text-4xl font-bold">Proceed to [Latest Counter]</h1>
        </div>

        {/* Queue Information Section */}
        <div className="flex flex-col bg-[#D0D0D0] px-6 py-4">
          <div className="flex justify-between items-center border-b-2 pb-4 mb-4">
            <h1 className="text-4xl font-semibold text-gray-800">Table</h1>
            <h1 className="text-4xl font-semibold text-gray-800">OSA Staff Name</h1>
            <h1 className="text-4xl font-semibold text-gray-800">Queue Number</h1>
          </div>
          {/* Example Rows */}
          <div className="flex justify-between items-center py-2">
            <span className="text-2xl font-medium text-gray-700">1</span>
            <span className="text-2xl font-medium text-gray-700">Mr. John Doe</span>
            <span className="text-2xl font-medium text-gray-700">S07</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-2xl font-medium text-gray-700">2</span>
            <span className="text-2xl font-medium text-gray-700">Ms. Jane Smith</span>
            <span className="text-2xl font-medium text-gray-700">S08</span>
          </div>
        </div>
      </div>
    </div>
  );
}
