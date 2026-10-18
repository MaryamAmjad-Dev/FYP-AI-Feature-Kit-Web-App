import React from 'react';
import LegalPage from '../components/LegalPage';

const PrivacyPolicy = () => (
  <LegalPage
    title="Privacy Policy"
    intro="Your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your information when you use AI Feature Kit."
    sections={[
      {
        heading: '1. Information Collection',
        items: [
          'We collect basic user information such as email address during signup.',
          'Data collected may include usage analytics to improve our services.',
        ],
      },
      {
        heading: '2. Data Usage',
        items: [
          'Your information is used to provide and enhance our services.',
          'We do not sell or share your data with third parties.',
        ],
      },
      {
        heading: '3. Cookies',
        body: 'We may use cookies to personalize content and track website traffic. You can disable cookies through your browser settings.',
      },
      {
        heading: '4. Data Security',
        body: 'We implement industry-standard security measures to protect your data from unauthorized access or disclosure.',
      },
      {
        heading: '5. Third-Party Links',
        body: 'Our platform may contain links to external sites. We are not responsible for the privacy practices of these websites.',
      },
      {
        heading: '6. Updates to Policy',
        body: 'This Privacy Policy may be updated from time to time. Please review this page regularly for any changes.',
      },
      {
        heading: '7. Contact Us',
        body: 'If you have any questions regarding this policy, please contact us via the form on our Contact page.',
      },
    ]}
  />
);

export default PrivacyPolicy;
