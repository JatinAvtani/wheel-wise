import { BarLoader } from "react-spinners";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BarLoader width={"200px"} color="#36d7b7" />
    </div>
  );
}
