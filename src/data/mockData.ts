import { Department, Transport, Destination, Project } from '@/types';

export const departments: Department[] = [
  {
    id: 'dept-1',
    name: 'Dział Elektryczny',
    equipment: [
      {
        id: 'eq-1',
        name: 'Generator 100kW',
        status: 'ready',
        department_id: 'dept-1',
        accessories: [
          { id: 'acc-1', name: 'Kable zasilające', status: 'ready', department_id: 'dept-1' },
          { id: 'acc-2', name: 'Panel sterowania', status: 'ready', department_id: 'dept-1' },
        ]
      },
      {
        id: 'eq-2',
        name: 'Transformator 220V',
        status: 'pending',
        department_id: 'dept-1',
        accessories: [
          { id: 'acc-3', name: 'Izolatory', status: 'pending', department_id: 'dept-1' },
        ]
      },
      {
        id: 'eq-3',
        name: 'Rozdzielnia główna',
        status: 'ready',
        department_id: 'dept-1',
      }
    ]
  },
  {
    id: 'dept-2',
    name: 'Dział Mechaniczny',
    equipment: [
      {
        id: 'eq-4',
        name: 'Pompa hydrauliczna',
        status: 'ready',
        department_id: 'dept-2',
        accessories: [
          { id: 'acc-4', name: 'Przewody hydrauliczne', status: 'ready', department_id: 'dept-2' },
          { id: 'acc-5', name: 'Filtry oleju', status: 'ready', department_id: 'dept-2' },
        ]
      },
      {
        id: 'eq-5',
        name: 'Kompressor',
        status: 'loading',
        department_id: 'dept-2',
      },
      {
        id: 'eq-6',
        name: 'Silnik 50HP',
        status: 'ready',
        department_id: 'dept-2',
        accessories: [
          { id: 'acc-6', name: 'Sprzęgło', status: 'ready', department_id: 'dept-2' },
        ]
      }
    ]
  },
  {
    id: 'dept-3',
    name: 'Dział IT',
    equipment: [
      {
        id: 'eq-7',
        name: 'Serwer Dell R740',
        status: 'ready',
        department_id: 'dept-3',
        accessories: [
          { id: 'acc-7', name: 'Kable sieciowe', status: 'ready', department_id: 'dept-3' },
          { id: 'acc-8', name: 'UPS 2000VA', status: 'ready', department_id: 'dept-3' },
        ]
      },
      {
        id: 'eq-8',
        name: 'Switch 48-port',
        status: 'pending',
        department_id: 'dept-3',
      }
    ]
  }
];

export const transport: Transport = {
  id: 'transport-1',
  equipment: [],
  capacity: 20
};

export const destinations: Destination[] = [
  {
    id: 'dest-1',
    name: 'Magazyn Główny',
    equipment: []
  },
  {
    id: 'dest-2',
    name: 'Budowa A-1',
    equipment: []
  }
];

export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'Kompleks Mieszkaniowy Warszawa',
    description: 'Budowa 3 bloków mieszkalnych z infrastrukturą techniczną',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2025-06-30',
    location: 'Warszawa, ul. Marszałkowska'
  },
  {
    id: 'proj-2', 
    name: 'Centrum Handlowe Kraków',
    description: 'Nowoczesne centrum handlowe z kinem i restauracjami',
    status: 'active',
    startDate: '2024-03-01',
    endDate: '2025-12-15',
    location: 'Kraków, Nowa Huta'
  },
  {
    id: 'proj-3',
    name: 'Fabryka Motoryzacyjna Katowice',
    description: 'Rozbudowa linii produkcyjnej części samochodowych',
    status: 'pending',
    startDate: '2024-06-01',
    endDate: '2025-03-30',
    location: 'Katowice, Strefa Przemysłowa'
  },
  {
    id: 'proj-4',
    name: 'Hotel Zakopane Resort',
    description: 'Budowa luksusowego hotelu górskiego z SPA',
    status: 'active',
    startDate: '2023-09-15',
    endDate: '2024-08-30',
    location: 'Zakopane, Gubałówka'
  },
  {
    id: 'proj-5',
    name: 'Biurowiec Green Office Gdańsk',
    description: 'Ekologiczny kompleks biurowy klasy A',
    status: 'completed',
    startDate: '2023-01-10',
    endDate: '2023-12-20',
    location: 'Gdańsk, Olivia Business Centre'
  },
  {
    id: 'proj-6',
    name: 'Szpital Wojewódzki Poznań',
    description: 'Modernizacja bloku operacyjnego i oddziału kardiologii',
    status: 'active',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    location: 'Poznań, Szamarzewskiego'
  }
];