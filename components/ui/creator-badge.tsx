import Image from "next/image";

export default function CreatorBadge() {
  return (
    <div className="flex items-center justify-center my-auto py-3 ">
      <div className="flex items-center space-x-3 bg-white shadow-md border border-gray-200 rounded-xl p-3 hover:scale-105 transition-transform">
        <Image
          src="https://res.cloudinary.com/djenv5out/image/upload/StayWandererListing_Img/mzd8dtpalxs0lji30sgb.jpg"
          alt="Ashrarul Haque"
          width={48}
          height={48}
          className="rounded-full object-cover border-2 border-green-500"
        />
        <p className="text-gray-700 font-medium">
          Created by <span className="text-green-600">Ashrarul Haque</span>
        </p>
      </div>
    </div>
  );
}
