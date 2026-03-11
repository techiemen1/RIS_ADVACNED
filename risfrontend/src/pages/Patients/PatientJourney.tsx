// src/pages/Patients/PatientJourney.tsx
import React from 'react';
import { Badge } from '../../components/ui/badge'; // Assumes you have a badge component or use simple div
import { CheckCircle, Clock, PlayCircle, LogOut } from 'lucide-react';

type Status = 'scheduled' | 'checked_in' | 'in_progress' | 'completed';

const steps = [
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'checked_in', label: 'Checked In', icon: CheckCircle },
    { id: 'in_progress', label: 'In Progress', icon: PlayCircle },
    { id: 'completed', label: 'Completed', icon: LogOut },
];

export const PatientJourney: React.FC<{ status: Status }> = ({ status }) => {
    const currentIdx = steps.findIndex(s => s.id === status);

    return (
        <div className="flex items-center gap-2 w-full max-w-md my-2">
            {steps.map((step, idx) => {
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex flex-col items-center gap-1 ${isCompleted ? 'text-blue-600' : 'text-gray-300'}`}>
                            <div className={`p-1 rounded-full border-2 ${isCompleted ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                                <Icon size={16} />
                            </div>
                            <span className="text-[10px] font-medium uppercase">{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-1 flex-1 mx-2 rounded ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
