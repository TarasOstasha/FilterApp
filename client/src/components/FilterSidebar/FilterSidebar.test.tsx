// src/components/FilterSidebar/FilterSidebar.test.tsx
// import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
// import FilterSidebar from './FilterSidebar';
// import * as api from '../../api';

// jest.mock('../../api', () => ({
//     fetchFilterSidebarData: jest.fn().mockResolvedValue({
//       data: [
//         {
//           id: 1,
//           field_name: 'Product Price',
//           field_type: 'range',
//           allowed_values: ['0', '100000'],
//         },
//       ],
//     }),
//     fetchHeightRange: jest.fn().mockResolvedValue({ min: 0, max: 100 }),
//     fetchWidthRange: jest.fn().mockResolvedValue({ min: 0, max: 100 }),
//     fetchPriceRange: jest.fn().mockResolvedValue({ min: 0, max: 100000, breakpoints: [] }),
//   }));


//   describe('FilterSidebar - Product Price functionality', () => {
//     it('calls onFilterChange when price range changes', async () => {
//         const onFilterChange = jest.fn();

//         render(<FilterSidebar onFilterChange={onFilterChange} selectedFilters={{}} />);
//         await screen.findByRole('complementary', { name: /filters/i });
//         //expect(sidebar).toBeInTheDocument();

//         //const minInput = await screen.findByDisplayValue('0');
//         // const maxInput = await screen.findByDisplayValue('100000');

//         // fireEvent.change(minInput, { target: { value: '200' } });
//         // fireEvent.change(maxInput, { target: { value: '500' } });

//         // expect(onFilterChange).toHaveBeenCalledWith({
//         //   field: 'Product Price',
//         //   value: '200,500',
//         // });
//       });
//   });


// src/components/FilterSidebar/FilterSidebar.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterSidebar from './FilterSidebar';

// Use fake timers for the 500ms debounce in the component
jest.useFakeTimers();

// Mock the API layer used by FilterSidebar
jest.mock('../../api', () => ({
    fetchFilterSidebarData: jest.fn().mockResolvedValue({
        data: [
            {
                id: 1,
                field_name: 'Brand',
                field_type: 'checkbox',
                allowed_values: ['Acme', 'Globex'],
                sort_order: 0,
            },
            {
                id: 2,
                field_name: 'Product Price',
                field_type: 'range',
                allowed_values: [],
                sort_order: 1,
            },
        ],
    }),
    fetchDynamicFilters: jest.fn().mockResolvedValue({ data: [] }),
    fetchPriceRange: jest.fn().mockResolvedValue({
        data: { min: 0, max: 1000, breakpoints: [0, 100, 200, 500, 1000] },
    }),
    fetchWidthRange: jest.fn().mockResolvedValue({
        data: { min: 10, max: 100, globalMin: 10, globalMax: 100 },
    }),
    fetchHeightRange: jest.fn().mockResolvedValue({
        data: { min: 5, max: 80, globalMin: 5, globalMax: 80 },
    }),
}));

describe('FilterSidebar', () => {
    const onFilterChange = jest.fn();

    const renderSidebar = (selectedFilters: Record<string, string[]> = {}) =>
        render(<FilterSidebar onFilterChange={onFilterChange} selectedFilters={selectedFilters} />);

    it('renders the sidebar landmark', async () => {
        renderSidebar();
        // allow the 500ms debounce to run and promises to resolve
        await act(async () => {
            jest.advanceTimersByTime(600);
        });

        expect(screen.getByRole('complementary', { name: /filters/i })).toBeInTheDocument();
    });

    // it('calls onFilterChange when a checkbox is clicked', async () => {
    //     renderSidebar();

    //     await act(async () => {
    //         jest.advanceTimersByTime(600);
    //     });

    //     const checkbox = await screen.findByRole('checkbox', { name: 'Acme' });
    //     fireEvent.click(checkbox);

    //     expect(onFilterChange).toHaveBeenCalledWith({ field: 'Brand', value: 'Acme' });
    // });
});




// sanity.test.ts
describe('Sanity check', () => {
    it('adds 2 + 2 correctly', () => {
        expect(2 + 2).toBe(4);
    });
});

