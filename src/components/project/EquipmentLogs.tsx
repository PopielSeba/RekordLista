import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, User, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EquipmentLog {
  id: string;
  project_id: string;
  equipment_id: string | null;
  project_equipment_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  details: any;
  user_id: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

interface EquipmentLogsProps {
  projectId: string;
}

export const EquipmentLogs = ({ projectId }: EquipmentLogsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<EquipmentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // All authenticated users can view logs
  const canViewLogs = !!user;

  const fetchLogs = async () => {
    if (!canViewLogs) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment_logs')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać logów",
          variant: "destructive",
        });
        return;
      }

      setLogs((data as any) || []);
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas pobierania logów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && canViewLogs) {
      fetchLogs();
    }
  }, [isOpen, canViewLogs]);

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'added': return 'bg-green-100 text-green-800 border-green-200';
      case 'status_changed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'position_changed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'added': return 'Dodano';
      case 'status_changed': return 'Zmiana statusu';
      case 'position_changed': return 'Zmiana pozycji';
      default: return actionType;
    }
  };

  const exportLogsToText = () => {
    let textContent = `LOGI SPRZĘTU - PROJEKT ${projectId}\n`;
    textContent += `Wygenerowane: ${new Date().toLocaleString('pl-PL')}\n`;
    textContent += `Liczba wpisów: ${logs.length}\n`;
    textContent += '='.repeat(80) + '\n\n';

    logs.forEach((log, index) => {
      textContent += `${index + 1}. ${getActionLabel(log.action_type)}\n`;
      textContent += `   Data: ${new Date(log.created_at).toLocaleString('pl-PL')}\n`;
      
      // Add user information
      if (log.profiles?.display_name || log.profiles?.email) {
        textContent += `   Wykonał: ${log.profiles.display_name || log.profiles.email || 'Nieznany użytkownik'}\n`;
      } else if (log.user_id) {
        textContent += `   Wykonał: Użytkownik ${log.user_id}\n`;
      }
      
      if (log.old_value && log.new_value) {
        textContent += `   Zmiana: ${log.old_value} → ${log.new_value}\n`;
      } else if (log.new_value) {
        textContent += `   Wartość: ${log.new_value}\n`;
      }
      
      if (log.details) {
        if (log.details.equipment_name) {
          textContent += `   Sprzęt: ${log.details.equipment_name}\n`;
        }
        if (log.details.department) {
          textContent += `   Dział: ${log.details.department}\n`;
        }
        if (log.details.is_custom) {
          textContent += `   Typ: Sprzęt niestandardowy\n`;
        }
      }
      
      textContent += '-'.repeat(40) + '\n';
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logi_sprzet_${projectId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Sukces",
      description: "Logi zostały wyeksportowane do pliku tekstowego",
    });
  };

  if (!canViewLogs) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Logi sprzętu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logi aktywności sprzętu
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogsToText}
                disabled={logs.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Eksportuj
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                Odśwież
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak logów do wyświetlenia</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {logs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={getActionBadgeColor(log.action_type)}
                            >
                              {getActionLabel(log.action_type)}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(log.created_at).toLocaleString('pl-PL')}
                            </div>
                          </div>
                          
                          {log.details?.equipment_name && (
                            <div className="flex items-center gap-1 text-sm">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{log.details.equipment_name}</span>
                              {log.details.is_custom && (
                                <Badge variant="outline" className="text-xs">
                                  Niestandardowy
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {log.old_value && log.new_value ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Zmiana:</span>{' '}
                              <span className="line-through text-red-600">{log.old_value}</span>
                              {' → '}
                              <span className="text-green-600">{log.new_value}</span>
                            </div>
                          ) : log.new_value ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Wartość:</span>{' '}
                              <span className="font-medium">{log.new_value}</span>
                            </div>
                          ) : null}
                          
                          {/* User information */}
                          {(log.profiles?.display_name || log.profiles?.email || log.user_id) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>
                                Wykonał: {log.profiles?.display_name || log.profiles?.email || `Użytkownik ${log.user_id}`}
                              </span>
                            </div>
                          )}
                          
                          {log.details?.department && (
                            <div className="text-xs text-muted-foreground">
                              Dział: {log.details.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};