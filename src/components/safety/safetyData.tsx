
import { Car, Caravan, ArrowLeft, Flag } from "lucide-react";
import { SafetyTopic } from "./types";

export const safetyTopics: SafetyTopic[] = [
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
