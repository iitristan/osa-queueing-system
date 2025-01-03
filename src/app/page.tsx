import Image from "next/image";

export default function Home() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <nav className="bg-[#111111] border-[#FCBF15] border-b-4">
        <Image
          src="/osa_header.png"
          alt="UST Logo"
          width={500}
          height={200}
          className="p-3"
        />
      </nav>
      <div className="grid grid-cols-2 gap-1 h-full">
        <div className="flex flex-col justify-center items-center bg-[#D0D0D0]">
          <h1 className="text-4xl font-bold">Now Serving</h1>
          <h1 className="text-9xl font-bold">S07</h1>
          <h1 className="text-4xl font-bold">Proceed to [Latest Counter]</h1>
        </div>

        <div className="flex grid-cols-*  bg-[#D0D0D0] ">
          <div className="border-r-2 px-10 py-4 items-center">
            <h1 className="text-4xl font-bold">Table</h1>
          </div>
          <div className="border-r-2 px-10 py-4 items-center">
            <h1 className="text-4xl font-bold">OSA Staff</h1>
          </div>
          <div className="px-10 py-4 items-center">
            <h1 className="text-4xl font-bold">Queue Number</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
