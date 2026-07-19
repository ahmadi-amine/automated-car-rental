export interface CarMake {
    Make_ID: number;
    Make_Name: string;
}

export interface CarModel {
    Make_ID: number;
    Make_Name: string;
    Model_ID: number;
    Model_Name: string;
}

export const carApi = {
    async getMakes(): Promise<CarMake[]> {
        try {
            // Using GetMakesForVehicleType to filter for actual passenger cars (not trailers/trucks)
            const response = await fetch(
                'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/passenger%20car?format=json'
            );
            const data = await response.json();

            // Clean up and sort
            return data.Results
                .map((m: any) => ({
                    Make_ID: m.MakeId,
                    Make_Name: m.MakeName.trim()
                }))
                .filter((m: any) =>
                    !m.Make_Name.toLowerCase().includes('trailer') &&
                    !m.Make_Name.toLowerCase().includes('mfg') &&
                    !m.Make_Name.toLowerCase().includes('fab')
                )
                .sort((a: any, b: any) => a.Make_Name.localeCompare(b.Make_Name));
        } catch (error) {
            console.error('Error fetching makes:', error);
            return [];
        }
    },

    async getModelsForMake(make: string): Promise<CarModel[]> {
        try {
            const response = await fetch(
                `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${make}?format=json`
            );
            const data = await response.json();
            return data.Results;
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }
};
