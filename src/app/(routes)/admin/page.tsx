import Image from "next/image";

export default function Admin() {
  return (
    <div className="">
      <nav >
        <Image
          src="/ust-long.png"
          alt="UST Logo"
          width={500}
          height={200}
          className="p-4"
        />
      </nav>
      <div>
        <h2>Now Serving</h2>
        <h1>(LATEST UPDATED NUMBER)</h1>
        <h2>Proceed to Counter 2</h2>
      </div>
      
      <div>
        <ul>
          <li>Counter 1 - Sir Harold</li>
          
          <li>Counter 2</li>
          <li>Counter 3</li>
          <li>Counter 4</li>
        </ul>
      </div>
    </div>
  );
}
