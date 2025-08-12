// Minimal axios mock good enough for your api tests
interface MockAxios {
    create: jest.Mock<MockAxios>;
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
}

const mockAxios: MockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
};
  
  export default mockAxios;
  