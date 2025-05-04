
import { Car, Caravan, ArrowLeft, Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Safety = () => {
  const safetyTopics = [
    {
      id: "balance",
      title: "Balance Your Caravan",
      description: "Learn how to properly balance your caravan for safe towing",
      icon: <Caravan className="h-12 w-12 text-blue-600" />,
      content: (
        <>
          <h3 className="text-xl font-bold mb-4">How to Balance Your Caravan</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start">
              <span className="bg-blue-100 rounded-full p-1 mr-2">1</span>
              <span>Load heavier items low and over the axle</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 rounded-full p-1 mr-2">2</span>
              <span>Aim for 10% of total weight on the tow ball</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 rounded-full p-1 mr-2">3</span>
              <span>Distribute weight evenly side-to-side</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 rounded-full p-1 mr-2">4</span>
              <span>Use a weight distribution hitch for larger caravans</span>
            </li>
          </ul>
          <div className="mt-6">
            <img 
              src="https://images.unsplash.com/photo-1472396961693-142e6e269027" 
              alt="Properly balanced caravan" 
              className="rounded-lg w-full max-h-64 object-cover mb-4" 
            />
          </div>
        </>
      )
    },
    {
      id: "hitch",
      title: "Correct Hitching",
      description: "Step-by-step guide for properly hitching your caravan",
      icon: <Car className="h-12 w-12 text-green-600" />,
      content: (
        <>
          <h3 className="text-xl font-bold mb-4">Safe Hitching Steps</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start">
              <span className="bg-green-100 rounded-full p-1 mr-2">1</span>
              <span>Check caravan wheel chocks are in place</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 rounded-full p-1 mr-2">2</span>
              <span>Back vehicle slowly to align tow ball with coupling</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 rounded-full p-1 mr-2">3</span>
              <span>Lower coupling onto ball and secure safety latch</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 rounded-full p-1 mr-2">4</span>
              <span>Connect safety chains and electrical connections</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 rounded-full p-1 mr-2">5</span>
              <span>Test brake lights and indicators before departing</span>
            </li>
          </ul>
          <div className="mt-6">
            <img 
              src="https://images.unsplash.com/photo-1482938289607-e9573fc25ebb" 
              alt="Proper hitching demonstration" 
              className="rounded-lg w-full max-h-64 object-cover mb-4" 
            />
          </div>
        </>
      )
    },
    {
      id: "reverse",
      title: "Reversing Techniques",
      description: "Learn how to reverse your caravan with confidence",
      icon: <ArrowLeft className="h-12 w-12 text-purple-600" />,
      content: (
        <>
          <h3 className="text-xl font-bold mb-4">Confident Reversing Tips</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start">
              <span className="bg-purple-100 rounded-full p-1 mr-2">1</span>
              <span>Place your hand at the bottom of the steering wheel</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-100 rounded-full p-1 mr-2">2</span>
              <span>Move your hand in the direction you want the caravan to go</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-100 rounded-full p-1 mr-2">3</span>
              <span>Use a spotter when possible for extra guidance</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-100 rounded-full p-1 mr-2">4</span>
              <span>Practice in an empty parking lot before your trip</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-100 rounded-full p-1 mr-2">5</span>
              <span>Take it slow - there's no rush when reversing</span>
            </li>
          </ul>
          <div className="mt-6">
            <img 
              src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05" 
              alt="Caravan reversing demonstration" 
              className="rounded-lg w-full max-h-64 object-cover mb-4" 
            />
          </div>
        </>
      )
    },
    {
      id: "bestpractices",
      title: "Road Safety Practices",
      description: "Best practices to keep you safe on the road",
      icon: <Flag className="h-12 w-12 text-red-600" />,
      content: (
        <>
          <h3 className="text-xl font-bold mb-4">Road Safety Best Practices</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start">
              <span className="bg-red-100 rounded-full p-1 mr-2">1</span>
              <span>Allow extra stopping distance when towing</span>
            </li>
            <li className="flex items-start">
              <span className="bg-red-100 rounded-full p-1 mr-2">2</span>
              <span>Reduce speed in windy conditions</span>
            </li>
            <li className="flex items-start">
              <span className="bg-red-100 rounded-full p-1 mr-2">3</span>
              <span>Check tire pressure before each journey</span>
            </li>
            <li className="flex items-start">
              <span className="bg-red-100 rounded-full p-1 mr-2">4</span>
              <span>Take regular breaks to avoid fatigue</span>
            </li>
            <li className="flex items-start">
              <span className="bg-red-100 rounded-full p-1 mr-2">5</span>
              <span>Perform safety checks before departing</span>
            </li>
          </ul>
          <div className="mt-6">
            <img 
              src="https://images.unsplash.com/photo-1469474968028-56623f02e42e" 
              alt="Safe driving on the road" 
              className="rounded-lg w-full max-h-64 object-cover mb-4" 
            />
          </div>
        </>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">Caravan Safety Guide</h1>
        <p className="text-xl text-gray-700 max-w-3xl">
          Simple, easy-to-follow guides to help you stay safe on your travels.
        </p>
      </div>
      
      {/* Topic selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {safetyTopics.map((topic) => (
          <Card key={topic.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-center mb-4">
                {topic.icon}
              </div>
              <CardTitle className="text-2xl text-center">{topic.title}</CardTitle>
              <CardDescription className="text-center text-base">
                {topic.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full text-lg py-6" 
                onClick={() => {
                  const element = document.getElementById(topic.id);
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed content sections */}
      <div className="space-y-16">
        {safetyTopics.map((topic) => (
          <section 
            key={topic.id} 
            id={topic.id} 
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center gap-4 mb-6">
              {topic.icon}
              <h2 className="text-3xl font-bold">{topic.title}</h2>
            </div>
            <div className="pl-4 border-l-4 border-blue-500">
              {topic.content}
            </div>
            <div className="mt-8 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 text-lg"
              >
                Back to Top
              </Button>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button asChild size="lg" className="text-lg px-8 py-6">
          <Link to="/you">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Safety;
