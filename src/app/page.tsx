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
      <div className="grid grid-rows-4 grid-flow-col gap-2 m-2">
        <div className="row-span-4 content-center text-center bg-[#D0D0D0]">
          <h1 className="text-4xl font-bold">Now Serving</h1>
          <h1 className="text-9xl font-bold">S07</h1>
          <h1 className="text-4xl font-bold">Proceed to [Latest Counter]</h1>
        </div>

        <div className="text-center content-center row-span-1 py-5 bg-[#D0D0D0] ">
          <h1 className="text-4xl font-bold">Counter</h1>
          <h1 className="text-4xl font-bold">Queue Number</h1>
        </div>
        <div className="text-center row-span-1 py-20 bg-[#D0D0D0] ">s</div>
        <div className="text-center row-span-1 py-20 bg-[#D0D0D0] ">s</div>
        <div className="text-center row-span-1 py-20 bg-[#D0D0D0] ">s</div>
      </div>
    </div>
  );
}
