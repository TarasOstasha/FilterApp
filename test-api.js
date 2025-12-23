const axios = require('axios');

async function testAPIs() {
  try {
    console.log('\n=== Testing /api/filterField?catId=10709 ===');
    const res1 = await axios.get('http://localhost:5000/api/filterField?catId=10709');
    console.log('Status:', res1.status);
    console.log('Data:', JSON.stringify(res1.data, null, 2));

    console.log('\n=== Testing /api/dynamic-filters?catId=10709 ===');
    const res2 = await axios.get('http://localhost:5000/api/dynamic-filters?catId=10709');
    console.log('Status:', res2.status);
    console.log('Data:', JSON.stringify(res2.data, null, 2));

    console.log('\n=== Testing /api/products?catId=10709 ===');
    const res3 = await axios.get('http://localhost:5000/api/products?catId=10709&limit=5');
    console.log('Status:', res3.status);
    console.log('Total products:', res3.data.totalProducts);
    console.log('Returned products:', res3.data.products?.length || 0);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPIs();
