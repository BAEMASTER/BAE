import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <h1>Privacy Policy</h1>
      <p className="subtitle">Last updated: February 2026</p>

      <p>BAE Technologies LLC (&quot;BAE,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the BAE platform at baewithme.com (the &quot;Platform&quot;). This Privacy Policy describes how we collect, use, store, and protect your personal information when you use BAE.</p>
      <p>We believe in transparency and simplicity. This policy is written to be clear and straightforward so you understand exactly what data we collect and why.</p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide</h3>
      <p><strong>Account Information.</strong> When you sign up through Google OAuth, we receive your Google account name and email address. You also provide your first name, last name, date of birth (for age verification), and general location (city and state).</p>
      <p><strong>Interest Data.</strong> You create and manage a list of your interests, passions, professional skills, favorite places, and more. This data is central to the BAE experience and is visible to other users.</p>
      <p><strong>Saved Profiles.</strong> When you save another user&apos;s profile, we store that connection along with the source (e.g., &quot;Met on video&quot; or &quot;Found exploring&quot;) and timestamp.</p>

      <h3>1.2 Information Collected Automatically</h3>
      <p><strong>Usage Data.</strong> We collect information about how you use BAE, including match activity, interests added or teleported, session duration, and feature interactions.</p>
      <p><strong>Device Information.</strong> We may collect information about the device you use to access BAE, including device type, operating system, browser type, and screen resolution.</p>
      <p><strong>Heartbeat Data.</strong> To ensure accurate matching, we collect periodic status updates (&quot;heartbeats&quot;) to determine whether you are actively online. This data is used solely for match availability and is not stored long-term.</p>

      <h3>1.3 Information We Do NOT Collect</h3>
      <ul>
        <li>We do NOT record, store, or archive any video or audio from your conversations</li>
        <li>We do NOT collect your precise GPS location (only the general city and state you provide)</li>
        <li>We do NOT collect financial information or payment data (BAE is currently free)</li>
        <li>We do NOT use facial recognition technology</li>
        <li>We do NOT sell your personal data to third parties</li>
        <li>We do NOT allow profile photos — the only visual representation of you on BAE is your live, unfiltered video during a match</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect for the following purposes:</p>
      <ul>
        <li>To create and maintain your account</li>
        <li>To match you with other users for live video conversations</li>
        <li>To display shared interests during video matches</li>
        <li>To power the Vibe Meter and MEGAVIBE features</li>
        <li>To enable the Explorer feature so other users can discover your interest profile</li>
        <li>To manage saved profiles and connections</li>
        <li>To detect and prevent fraud, abuse, and violations of our Terms of Service</li>
        <li>To improve and optimize the Platform&apos;s performance and user experience</li>
        <li>To communicate with you about your account, updates, or support requests</li>
        <li>To comply with legal obligations</li>
      </ul>

      <h2>3. How We Share Your Information</h2>

      <h3>3.1 With Other BAE Users</h3>
      <p>The following information is visible to other BAE users: your first name and last initial, your general location (city and state), and your interest list. During a video match, your live video and audio feed is transmitted directly to your match partner.</p>

      <h3>3.2 With Service Providers</h3>
      <p>We use trusted third-party services to operate the Platform:</p>
      <ul>
        <li><strong>Google Firebase / Firestore</strong> — for authentication, data storage, and real-time database functionality</li>
        <li><strong>Daily.co</strong> — for WebRTC video and audio transmission</li>
        <li><strong>Vercel</strong> — for web application hosting</li>
      </ul>
      <p>These providers process data on our behalf and are contractually obligated to protect your information and use it only for the purposes we specify.</p>

      <h3>3.3 For Legal Reasons</h3>
      <p>We may disclose your information if required by law, in response to a valid legal process (such as a subpoena or court order), or when we believe disclosure is necessary to protect the rights, property, or safety of BAE, our users, or the public.</p>

      <h3>3.4 We Do NOT Sell Your Data</h3>
      <p>BAE does not sell, rent, or trade your personal information to third parties for marketing or advertising purposes. Period.</p>

      <h2>4. Data Storage and Security</h2>
      <p>Your data is stored using Google Firebase/Firestore with industry-standard security measures, including encryption in transit (TLS/SSL) and at rest. We implement reasonable administrative, technical, and physical safeguards to protect your information from unauthorized access, use, or disclosure.</p>
      <p>While we take security seriously, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security of your data, but we are committed to protecting it to the best of our ability.</p>

      <h2>5. Data Retention</h2>
      <p>We retain your account data and interest profile for as long as your account is active. If you request account deletion, we will delete your personal data within 30 days, except where we are required to retain certain information for legal or compliance purposes.</p>
      <p>Heartbeat and session data is temporary and is automatically purged when no longer needed for matching purposes.</p>
      <p>MEGAVIBE pair records (which track that two users have already experienced the MEGAVIBE celebration) are retained to ensure the feature functions correctly, but contain only anonymized user ID pairs with no personal information.</p>

      <h2>6. Your Rights and Choices</h2>
      <p>You have the following rights regarding your personal data:</p>
      <p><strong>Access.</strong> You can view your profile information at any time within the app.</p>
      <p><strong>Update.</strong> You can update your interests, name, and location through the Profile page at any time.</p>
      <p><strong>Delete.</strong> You can request complete deletion of your account and associated data by contacting us at <a href="mailto:support@baewithme.com">support@baewithme.com</a>. We will process your request within 30 days.</p>
      <p><strong>Export.</strong> You may request a copy of your personal data by contacting us at <a href="mailto:support@baewithme.com">support@baewithme.com</a>.</p>
      <p><strong>Opt Out.</strong> You can remove any interest from your profile at any time. You can unsave any saved profile at any time.</p>

      <h2>7. California Residents (CCPA)</h2>
      <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to request deletion, and the right to opt out of the sale of personal information. As stated above, we do not sell personal information.</p>
      <p>To exercise your CCPA rights, contact us at <a href="mailto:support@baewithme.com">support@baewithme.com</a>. We will respond to verifiable requests within 45 days.</p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>BAE is not intended for anyone under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected data from a user under 18, we will immediately delete their account and all associated data. If you believe a minor is using BAE, please contact us at <a href="mailto:support@baewithme.com">support@baewithme.com</a>.</p>

      <h2>9. International Users</h2>
      <p>BAE is operated from the United States. If you are accessing BAE from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where data protection laws may differ from those in your country. By using BAE, you consent to this transfer.</p>

      <h2>10. Cookies and Tracking Technologies</h2>
      <p>BAE uses essential cookies and local storage for authentication and session management. We do not use advertising cookies, tracking pixels, or third-party analytics that follow you across the web.</p>
      <p>We may use basic, privacy-respecting analytics to understand aggregate usage patterns (such as total number of matches or active users) to improve the Platform. This data is not tied to individual users.</p>

      <h2>11. Third-Party Links</h2>
      <p>BAE may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.</p>

      <h2>12. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. If we make material changes, we will notify you by posting the updated policy on the Platform and updating the &quot;Last updated&quot; date. Your continued use of BAE after any changes constitutes your acceptance of the updated policy.</p>

      <h2>13. Contact Us</h2>
      <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:</p>
      <div className="contact-block">
        <p><strong>BAE Technologies LLC</strong></p>
        <p>Email: <a href="mailto:support@baewithme.com">support@baewithme.com</a></p>
        <p>Website: baewithme.com</p>
      </div>

      <p className="copyright">&copy; 2026 BAE Technologies LLC. All rights reserved.</p>
    </LegalLayout>
  );
}
