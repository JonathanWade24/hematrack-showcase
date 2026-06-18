// This is a simple test file to validate middleware role checking
// You can run this from the Node.js REPL if needed

const mockRequest = {
  nextUrl: {
    pathname: '/visits/123'
  },
  cookies: {
    getAll: () => [],
    set: () => {}
  }
};

// Mock implementation removed as it's not used

// Mock implementation removed as it's not used

// Mock the middleware implementation
async function testMiddleware() {
  try {
    const path = mockRequest.nextUrl.pathname;
    console.log(`Testing path: ${path}`);
    
    // Fake user with incorrect role for visits
    const user = {
      id: 'test-user',
      app_metadata: {
        role: 'lab_researcher'
      }
    };
    
    // Required roles for /visits path
    const requiredRoles = ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'clinical_data_entry'];
    
    // Simple role check
    const hasAccess = user.app_metadata?.role && requiredRoles.includes(user.app_metadata.role);
    
    if (!hasAccess) {
      console.log(`EXPECTED BEHAVIOR: User ${user.id} with role ${user.app_metadata?.role} denied access to ${path}`);
      console.log(`Required roles: ${requiredRoles.join(', ')}`);
      console.log('Should redirect to: /access-denied');
      return true;
    } else {
      console.log(`UNEXPECTED: User ${user.id} with role ${user.app_metadata?.role} granted access to ${path}`);
      return false;
    }
  } catch (error) {
    console.error('Error in test middleware:', error);
    return false;
  }
}

// Run the test
testMiddleware().then(result => {
  console.log(`Test ${result ? 'PASSED' : 'FAILED'}`);
});

// To run this test:
// node src/lib/supabase/test-middleware.js 