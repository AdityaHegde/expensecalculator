my $str = `cat $ARGV[0]`;

for (my $i = 2; $i < scalar @ARGV - 1; $i++) {
  my $f = $ARGV[$i];
  $str =~ s/^\s*<script src="js\/$f"><\/script>\s*\n//gm;
}

my $lastFile = $ARGV[scalar @ARGV - 1];
my $replaceFile = $ARGV[1];
$str =~ s/<script src="js\/$lastFile"><\/script>/<script src="$replaceFile"><\/script>/gm;

$str =~ s/css\///gm;
$str =~ s/\.css/.min.css/gm;
$str =~ s/js\///gm;

print $str;
