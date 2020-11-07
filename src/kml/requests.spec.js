import { performQuery } from '../db';
jest.mock('../db');
import { getRequestsKML } from './requests';

describe('getRequestsKML', () => {
  it('renders KML for current install requests', async () => {
    performQuery.mockResolvedValue([
      {
        id: 8142,
        building: {
          lng: '34.51423',
          lat: '-71.31241',
          alt: '50m',
        },
        date: new Date(1604713833247),
        roof_access: true,
        panoramas: [],
      },
      {
        id: 9133,
        building: {
          lng: '34.51423',
          lat: '-71.31241',
          alt: '50m',
        },
        date: new Date(1604713833247),
        roof_access: false,
        panoramas: [
          { url: 'https://pano.rama' }
        ],
      },
    ]);

    expect(await getRequestsKML()).toMatchSnapshot()
  });
});
