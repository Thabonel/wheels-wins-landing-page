import TripPlanner from "@/components/wheels/TripPlanner";

const Wheels = () => {
  return (
    <>
      {/* Main content */}
      <main className="container px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full">
          <TripPlanner />
        </div>
      </main>
    </>
  );
};

export default Wheels;