import { performQuery } from '../db';
jest.mock('../db');
import { getRequestsKML } from './requests';

describe('getRequestsKML', () => {
  it('renders KML for current install requests', async () => {
    performQuery.mockResolvedValue([
      {
        id: 7059,
        status: 'open',
        apartment: null,
        roof_access: true,
        date: new Date('2020-09-18T12:42:20.811Z'),
        osticket_id: null,
        member_id: 6087,
        building_id: 5758,
        building: {
          id: 5758,
          address: 'Redacted',
          lat: 40.6604126,
          lng: -73.9428339,
          alt: 32,
          bin: 3114902,
          notes: null
        },
        panoramas: null
      },
      {
        id: 7060,
        status: 'open',
        apartment: null,
        roof_access: false,
        date: new Date('2020-10-18T12:42:20.811Z'),
        osticket_id: null,
        member_id: 6088,
        building_id: 5759,
        building: {
          id: 5759,
          address: 'Redacted',
          lat: 41.6604126,
          lng: -72.9428339,
          alt: 33,
          bin: 3114911,
          notes: null
        },
        panoramas: null
      },
    ]);

    expect(await getRequestsKML()).toMatchSnapshot()
  });
});
