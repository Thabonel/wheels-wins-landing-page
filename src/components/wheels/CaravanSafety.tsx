
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, Wrench } from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  completed: boolean;
  critical: boolean;
  description?: string;
}

const defaultChecklist: Omit<ChecklistItem, 'completed'>[] = [
  // Vehicle Checks
  { id: "tyres", category: "Vehicle", task: "Check tyre pressure and condition", critical: true, description: "Include spare tyre" },
  { id: "lights", category: "Vehicle", task: "Test all lights (indicators, brake, reverse)", critical: true },
  { id: "mirrors", category: "Vehicle", task: "Adjust mirrors for towing", critical: true },
  { id: "fluids", category: "Vehicle", task: "Check oil, coolant, brake fluid levels", critical: true },
  { id: "battery", category: "Vehicle", task: "Test battery and charging system", critical: false },
  
  // Caravan Checks
  { id: "hitch", category: "Caravan", task: "Inspect hitch and coupling", critical: true, description: "Check safety chains and breakaway cable" },
  { id: "handbrake", category: "Caravan", task: "Test caravan handbrake", critical: true },
  { id: "jockey", category: "Caravan", task: "Secure jockey wheel in up position", critical: true },
  { id: "stabilizers", category: "Caravan", task: "Retract corner stabilizers", critical: true },
  { id: "caravan-tyres", category: "Caravan", task: "Check caravan tyre pressure and condition", critical: true },
  { id: "caravan-lights", category: "Caravan", task: "Test all caravan lights", critical: true },
  
  // Safety & Emergency
  { id: "first-aid", category: "Safety", task: "First aid kit accessible and stocked", critical: true },
  { id: "fire-extinguisher", category: "Safety", task: "Fire extinguisher charged and accessible", critical: true },
  { id: "emergency-tools", category: "Safety", task: "Emergency tools and spare parts", critical: false },
  { id: "emergency-contacts", category: "Safety", task: "Emergency contact list updated", critical: false },
  
  // Interior Safety
  { id: "gas-off", category: "Interior", task: "Turn off gas bottles", critical: true },
  { id: "water-secure", category: "Interior", task: "Secure water system", critical: true },
  { id: "items-secured", category: "Interior", task: "All loose items secured", critical: true },
  { id: "doors-locked", category: "Interior", task: "All internal doors and cupboards locked", critical: false },
  
  // Documentation
  { id: "insurance", category: "Documents", task: "Insurance documents current", critical: true },
  { id: "registration", category: "Documents", task: "Vehicle and caravan registration", critical: true },
  { id: "licence", category: "Documents", task: "Valid driving licence", critical: true },
  { id: "maps", category: "Documents", task: "Maps and route planned", critical: false }
];

export default function CaravanSafety() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    // Load saved checklist from localStorage or use default
    const saved = localStorage.getItem('caravan-safety-checklist');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch {
        resetChecklist();
      }
    } else {
      resetChecklist();
    }
  }, []);

  const resetChecklist = () => {
    const newChecklist = defaultChecklist.map(item => ({
      ...item,
      completed: false
    }));
    setChecklist(newChecklist);
    localStorage.setItem('caravan-safety-checklist', JSON.stringify(newChecklist));
  };

  const toggleItem = (id: string) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    localStorage.setItem('caravan-safety-checklist', JSON.stringify(updated));
  };

  const getStats = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.completed).length;
    const criticalTotal = checklist.filter(item => item.critical).length;
    const criticalCompleted = checklist.filter(item => item.critical && item.completed).length;
    
    return { total, completed, criticalTotal, criticalCompleted };
  };

  const stats = getStats();
  const categories = ['Vehicle', 'Caravan', 'Safety', 'Interior', 'Documents'];
  
  const filteredChecklist = showCompleted 
    ? checklist 
    : checklist.filter(item => !item.completed);

  const isReadyToDrive = stats.criticalCompleted === stats.criticalTotal;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Caravan Safety Checklist</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Hide Completed' : 'Show All'}
          </Button>
          <Button variant="outline" onClick={resetChecklist}>
            Reset Checklist
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isReadyToDrive ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                Ready to Drive
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Safety Check Required
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}/{stats.total}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isReadyToDrive ? 'text-green-600' : 'text-red-600'}`}>
                {stats.criticalCompleted}/{stats.criticalTotal}
              </div>
              <div className="text-sm text-gray-600">Critical Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((stats.completed / stats.total) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <Badge variant={isReadyToDrive ? "default" : "destructive"} className="text-sm">
                {isReadyToDrive ? "SAFE" : "CHECK REQUIRED"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      <div className="grid gap-6">
        {categories.map(category => {
          const categoryItems = filteredChecklist.filter(item => item.category === category);
          if (categoryItems.length === 0) return null;

          const categoryIcon = {
            Vehicle: <Wrench className="w-5 h-5" />,
            Caravan: <Shield className="w-5 h-5" />,
            Safety: <AlertTriangle className="w-5 h-5" />,
            Interior: <CheckCircle className="w-5 h-5" />,
            Documents: <CheckCircle className="w-5 h-5" />
          }[category] || <CheckCircle className="w-5 h-5" />;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categoryIcon}
                  {category}
                  <Badge variant="outline">
                    {categoryItems.filter(item => item.completed).length}/{categoryItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${item.completed ? 'text-gray-500 line-through' : ''}`}>
                            {item.task}
                          </span>
                          {item.critical && (
                            <Badge variant="destructive">Critical</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
