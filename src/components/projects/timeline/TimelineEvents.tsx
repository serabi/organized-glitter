import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TimelineEvent {
  id: string;
  date: string | null;
  title: string;
  content: string;
  hasData: boolean;
}

interface TimelineEventsProps {
  events: TimelineEvent[];
}

const TimelineEvents = ({ events }: TimelineEventsProps) => {
  const isMobile = useIsMobile();

  if (!events.length) return null;

  return (
    <div className="mt-6">
      {isMobile ? (
        <Accordion type="single" collapsible className="w-full">
          {events.map(event => (
            <AccordionItem key={event.id} value={event.id}>
              <AccordionTrigger className="text-left">
                <div>
                  <span className="font-medium">{event.title}</span>
                  {event.date && (
                    <span className="ml-2 text-xs text-muted-foreground">{event.date}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p>{event.content}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="space-y-8">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex items-start">
              {/* Timeline connector */}
              {index < events.length - 1 && (
                <div className="absolute left-4 top-6 -ml-px h-full w-0.5 bg-gray-200"></div>
              )}

              {/* Timeline dot */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                <div className="h-2 w-2 rounded-full bg-white"></div>
              </div>

              {/* Content */}
              <div className="ml-4 w-full">
                <div className="mb-1 flex items-center">
                  <h3 className="text-lg font-medium">{event.title}</h3>
                  {event.date && (
                    <span className="ml-2 text-sm text-muted-foreground">{event.date}</span>
                  )}
                </div>

                <div className="mt-2">
                  <p>{event.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineEvents;
