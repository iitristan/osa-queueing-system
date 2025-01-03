import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="">
      <nav className="bg-[#111111] border-[#FCBF15] border-b-4">
        <Image
          src="/osa_header.png"
          alt="UST Logo"
          width={500}
          height={200}
          className="p-3"
        />
      </nav>
      <div className="grid grid-cols-2 grid-row-3">
        <div>
          <div className="text-center py-20 bg-[#D0D0D0] m-7">
            <h1 className="text-4xl font-bold">Now Serving</h1>
            <h1 className="text-9xl font-bold">S07</h1>
            <h1 className="text-4xl font-bold">Proceed to [Latest Counter]</h1>
          </div>
          <div className="text-center py-20 bg-[#D0D0D0] m-7">
            <h1 className="text-4xl font-bold">Now Serving</h1>
            <h1 className="text-9xl font-bold">S07</h1>
            <h1 className="text-4xl font-bold">Proceed to [Latest Counter]</h1>
          </div>
        </div>

        <div className="text-center">
          <div className="text-center py-20 bg-[#D0D0D0] m-7">s</div>
          <div className="text-center py-20 bg-[#D0D0D0] m-7">s</div>
          <div className="text-center py-20 bg-[#D0D0D0] m-7">s</div>
          <div className="text-center py-20 bg-[#D0D0D0] m-7">s</div>
        </div>
      </div>
    </div>
  );
}
