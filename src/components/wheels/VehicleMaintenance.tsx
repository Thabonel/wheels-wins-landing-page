
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function VehicleMaintenance() {
  const [maintenanceTasks, setMaintenanceTasks] = useState([
    { id: 1, task: 'Oil Change', date: '2025-06-15', mileage: 55000, status: 'upcoming' },
    { id: 2, task: 'Tire Rotation', date: '2025-05-30', mileage: 54000, status: 'upcoming' },
    { id: 3, task: 'Brake Inspection', date: '2025-08-10', mileage: 57000, status: 'upcoming' },
    { id: 4, task: 'Air Filter Replacement', date: '2025-10-05', mileage: 60000, status: 'upcoming' },
    { id: 5, task: 'Wiper Blades', date: '2025-05-01', mileage: 52000, status: 'overdue' },
    { id: 6, task: 'Battery Check', date: '2025-04-01', mileage: 51000, status: 'completed' },
  ]);

  return (
    <div className="space-y-6">
      {/* Maintenance Timeline */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Maintenance Timeline</h3>
        
        <div className="space-y-4">
          {/* Overdue Tasks */}
          <div>
            <h4 className="font-medium text-red-600 mb-2">Overdue</h4>
            <div className="space-y-2">
              {maintenanceTasks
                .filter(task => task.status === 'overdue')
                .map(task => (
                  <Card key={task.id} className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold">{task.task}</h5>
                          <p className="text-sm text-gray-600">Due: {task.date}</p>
                          <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                        </div>
                        <button className="bg-primary text-white py-1 px-3 rounded-md text-sm">
                          Schedule
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </div>
          
          {/* Upcoming Tasks */}
          <div>
            <h4 className="font-medium text-blue-600 mb-2">Upcoming</h4>
            <div className="space-y-2">
              {maintenanceTasks
                .filter(task => task.status === 'upcoming')
                .map(task => (
                  <Card key={task.id} className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold">{task.task}</h5>
                          <p className="text-sm text-gray-600">Due: {task.date}</p>
                          <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                        </div>
                        <button className="bg-primary text-white py-1 px-3 rounded-md text-sm">
                          Schedule
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </div>
          
          {/* Completed Tasks */}
          <div>
            <h4 className="font-medium text-green-600 mb-2">Completed</h4>
            <div className="space-y-2">
              {maintenanceTasks
                .filter(task => task.status === 'completed')
                .map(task => (
                  <Card key={task.id} className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold">{task.task}</h5>
                          <p className="text-sm text-gray-600">Completed: {task.date}</p>
                          <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                        </div>
                        <span className="text-green-600 text-sm font-medium">✓ Done</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </div>
        </div>
      </div>
      
      {/* Pam's suggestion */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold">Pam suggests:</h3>
        <p className="mt-2">Would you like to schedule your overdue wiper blade replacement? I can help find service centers near your current location.</p>
        <div className="mt-4 flex space-x-4">
          <button className="bg-primary text-white py-2 px-4 rounded-md">
            Find Service Centers
          </button>
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md">
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
