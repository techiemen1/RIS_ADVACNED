import React, { useState, useEffect } from 'react';
import { Search, User, Phone, Activity, Baby } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';
// Mock import for now, replace with actual API call
// import { searchPatients } from '@/api/patients'; 

interface PatientSearchProps {
    onSelect: (patient: Patient) => void;
    className?: string;
}

const PatientSearch: React.FC<PatientSearchProps> = ({ onSelect, className }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                handleSearch(query);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = async (searchTerm: string) => {
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // const data = await searchPatients(searchTerm);

            // Mock Data for Demo
            const mockData: Patient[] = [
                {
                    id: '1',
                    name: 'Anjali Sharma',
                    age: 28,
                    gender: 'Female',
                    mrn: 'RIS-2024-001',
                    phone: '9876543210', // Assuming phone exists in Patient type or added
                    isPregnant: true,
                    gestational_age: '12 Weeks 4 Days',
                    abhaId: '12-3456-7890-1234'
                },
                {
                    id: '2',
                    name: 'Rajesh Kumar',
                    age: 45,
                    gender: 'Male',
                    mrn: 'RIS-2024-002',
                    phone: '9988776655'
                }
            ].filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()));

            setResults(mockData);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("relative w-full max-w-md", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by Name, MRN, or ABHA..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    </div>
                )}
            </div>

            {results.length > 0 && (
                <Card className="absolute top-full mt-2 w-full z-50 max-h-[300px] overflow-y-auto shadow-xl border-slate-200">
                    <div className="p-1">
                        {results.map((patient) => (
                            <div
                                key={patient.id}
                                onClick={() => {
                                    onSelect(patient);
                                    setQuery('');
                                    setResults([]);
                                }}
                                className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-sm text-slate-900 truncate">{patient.name}</h4>
                                        {patient.isPregnant && (
                                            <span className="bg-pink-100 text-pink-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <Baby size={10} /> Pregnant
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                        <span>{patient.gender}, {patient.age}y</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{patient.mrn}</span>
                                    </p>
                                    {patient.isPregnant && patient.gestational_age && (
                                        <p className="text-[10px] text-pink-600 mt-1 font-medium">
                                            GA: {patient.gestational_age}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PatientSearch;
