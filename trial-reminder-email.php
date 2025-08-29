<?php
require_once 'config.php'; // Adjust path to your database config file

// Database connection
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_db_username';
$password = 'your_db_password';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Find users whose trial ends tomorrow and haven't been notified
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    $query = "SELECT tn.*, u.email, u.name 
              FROM trial_notifications tn
              JOIN users u ON tn.user_id = u.id
              WHERE tn.trial_end_date = :tomorrow
              AND tn.notification_sent = FALSE
              AND tn.subscription_cancelled = FALSE";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute(['tomorrow' => $tomorrow]);
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Generate unique cancellation token
        $token = bin2hex(random_bytes(32));
        
        // Update token in database
        $updateStmt = $pdo->prepare("UPDATE trial_notifications SET cancellation_token = :token WHERE id = :id");
        $updateStmt->execute(['token' => $token, 'id' => $row['id']]);
        
        // Send email
        $to = $row['email'];
        $subject = "Your Wheels and Wins trial ends tomorrow";
        $cancellationUrl = "https://yourdomain.com/cancel-trial.php?token=" . $token;
        
        $message = "
        <html>
        <head>
            <title>Your trial ends tomorrow</title>
        </head>
        <body>
            <h2>Hi {$row['name']},</h2>
            <p>Your 30-day free trial of Wheels and Wins ends tomorrow.</p>
            <p>If you're enjoying our service, you don't need to do anything - your subscription will automatically continue and you'll be charged for your first month.</p>
            <p>If you'd like to cancel before being charged, simply click the button below:</p>
            <p style='margin: 30px 0;'>
                <a href='{$cancellationUrl}' style='background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Cancel My Subscription</a>
            </p>
            <p>Thank you for trying Wheels and Wins!</p>
        </body>
        </html>
        ";
        
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: Wheels and Wins <noreply@yourdomain.com>' . "\r\n";
        
        if (mail($to, $subject, $message, $headers)) {
            // Mark as sent
            $sentStmt = $pdo->prepare("UPDATE trial_notifications SET notification_sent = TRUE WHERE id = :id");
            $sentStmt->execute(['id' => $row['id']]);
            echo "Email sent to {$row['email']}\n";
        } else {
            echo "Failed to send email to {$row['email']}\n";
        }
    }
    
    echo "Trial reminder process completed.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>